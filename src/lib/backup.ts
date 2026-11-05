import { z } from "zod";
import { DEFAULT_CATEGORIES, defaultAccounts } from "@/modules/finance/defaults";
import { needsFxRate } from "@/modules/finance/lib/transactions";
import {
  accountSchema,
  ATTACHMENT_TYPES,
  budgetSchema,
  categorySchema,
  recurringSchema,
  templateSchema,
  transactionSchema,
  type Account,
  type Attachment,
  type Budget,
  type Category,
  type Recurring,
  type Template,
  type Transaction,
} from "@/modules/finance/types";
import { todayInCancun } from "./dates";

/**
 * Respaldo de Bóveda: un archivo JSON con todos tus datos. El PIN y los intentos fallidos
 * nunca se incluyen. Cada versión nueva del formato debe poder leer las anteriores.
 *   v1 (Fase 0): ajustes.
 *   v2 (Fase 1, parte 1): ajustes, cuentas, categorías y movimientos.
 *   v3 (Fase 1, parte 2): además presupuestos, recurrentes, plantillas y fotos de tickets.
 */

export const BACKUP_VERSION = 3;

/** Ajustes que nunca salen del celular. */
export const PRIVATE_SETTING_KEYS = ["pin", "pinFailures"] as const;

const settingRowSchema = z.object({ key: z.string().min(1), value: z.unknown() });
export type SettingRow = z.infer<typeof settingRowSchema>;

/** En el archivo, la foto va como texto base64. */
const attachmentFileSchema = z.object({
  id: z.string().min(1).max(64),
  transactionId: z.string().min(1).max(64),
  mimeType: z.enum(ATTACHMENT_TYPES),
  dataBase64: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.number(),
});
type AttachmentFile = z.infer<typeof attachmentFileSchema>;

const backupSchema = z.object({
  app: z.literal("boveda"),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    settings: z.array(settingRowSchema),
    // Los respaldos anteriores no traen todas las tablas.
    accounts: z.array(accountSchema).optional(),
    categories: z.array(categorySchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    budgets: z.array(budgetSchema).optional(),
    recurring: z.array(recurringSchema).optional(),
    templates: z.array(templateSchema).optional(),
    attachments: z.array(attachmentFileSchema).optional(),
  }),
});

export type BackupTables = {
  settings: SettingRow[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  templates: Template[];
  attachments: Attachment[];
};

/** Tal como se escribe en el archivo. */
type BackupFileData = Omit<BackupTables, "attachments"> & { attachments: AttachmentFile[] };
export type BackupJson = { app: "boveda"; version: number; exportedAt: string; data: BackupFileData };
export type BackupFile = { app: "boveda"; version: number; exportedAt: string; data: BackupTables };

function isPrivate(key: string): boolean {
  return (PRIVATE_SETTING_KEYS as readonly string[]).includes(key);
}

export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(text: string): ArrayBuffer {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function buildBackup(tables: BackupTables, now: Date): BackupJson {
  return {
    app: "boveda",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      ...tables,
      settings: tables.settings.filter((row) => !isPrivate(row.key)),
      attachments: tables.attachments.map(({ data, ...rest }) => ({ ...rest, dataBase64: bytesToBase64(data) })),
    },
  };
}

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

const NOT_A_BACKUP = "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste.";
const DAMAGED = "El respaldo está dañado: tiene datos que apuntan a cuentas, categorías o movimientos que no existen.";

/** Revisa que todo apunte a cuentas, categorías y movimientos del mismo respaldo. */
function hasBrokenReferences(data: BackupTables): boolean {
  const accounts = new Map(data.accounts.map((account) => [account.id, account]));
  const categories = new Set(data.categories.map((category) => category.id));
  const transactions = new Set(data.transactions.map((transaction) => transaction.id));

  const movementBroken = (movement: Omit<Transaction, "id" | "date" | "createdAt" | "updatedAt">) => {
    const from = accounts.get(movement.accountId);
    const to = movement.toAccountId === null ? undefined : accounts.get(movement.toAccountId);
    if (!from || (movement.toAccountId !== null && !to)) return true;
    if (movement.categoryId !== null && !categories.has(movement.categoryId)) return true;
    const currencies = [from.currency, ...(to ? [to.currency] : [])];
    return needsFxRate(movement.currency, currencies) && movement.fxRate === null;
  };

  return (
    data.transactions.some(movementBroken) ||
    data.recurring.some((rule) => movementBroken(rule.template)) ||
    data.budgets.some((budget) => !categories.has(budget.categoryId)) ||
    data.templates.some(
      (template) =>
        (template.categoryId !== null && !categories.has(template.categoryId)) ||
        (template.accountId !== null && !accounts.has(template.accountId)) ||
        (template.toAccountId !== null && !accounts.has(template.toAccountId)),
    ) ||
    data.attachments.some((attachment) => !transactions.has(attachment.transactionId)) ||
    data.categories.some((category) => category.parentId !== null && !categories.has(category.parentId))
  );
}

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: NOT_A_BACKUP };
  if (parsed.data.version > BACKUP_VERSION) {
    return { ok: false, error: "Este respaldo es de una versión más nueva de Bóveda. Actualiza la app y vuelve a intentar." };
  }

  const { data } = parsed.data;
  const exportedAt = Date.parse(parsed.data.exportedAt);
  let attachments: Attachment[];
  try {
    attachments = (data.attachments ?? []).map(({ dataBase64, ...rest }) => ({ ...rest, data: base64ToBytes(dataBase64) }));
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const tables: BackupTables = {
    settings: data.settings.filter((row) => !isPrivate(row.key)),
    // Un respaldo de antes de Finanzas vuelve con lo que la app trae de inicio.
    accounts: data.accounts ?? defaultAccounts(Number.isNaN(exportedAt) ? 0 : exportedAt),
    categories: data.categories ?? DEFAULT_CATEGORIES,
    transactions: data.transactions ?? [],
    budgets: data.budgets ?? [],
    recurring: data.recurring ?? [],
    templates: data.templates ?? [],
    attachments,
  };
  if (hasBrokenReferences(tables)) return { ok: false, error: DAMAGED };
  return { ok: true, backup: { app: "boveda", version: parsed.data.version, exportedAt: parsed.data.exportedAt, data: tables } };
}

/** "boveda-respaldo-2026-11-05.json", con la fecha de Cancún. */
export function backupFileName(now: Date): string {
  return `boveda-respaldo-${todayInCancun(now)}.json`;
}
