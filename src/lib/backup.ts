import { z } from "zod";
import { DEFAULT_CATEGORIES, defaultAccounts } from "@/modules/finance/defaults";
import { needsFxRate } from "@/modules/finance/lib/transactions";
import {
  accountSchema,
  categorySchema,
  transactionSchema,
  type Account,
  type Category,
  type Transaction,
} from "@/modules/finance/types";
import { todayInCancun } from "./dates";

/**
 * Respaldo de Bóveda: un archivo JSON con todos tus datos. El PIN y los intentos fallidos
 * nunca se incluyen. Cada versión nueva del formato debe poder leer las anteriores.
 *   v1 (Fase 0): ajustes.
 *   v2 (Fase 1): ajustes, cuentas, categorías y movimientos.
 */

export const BACKUP_VERSION = 2;

/** Ajustes que nunca salen del celular. */
export const PRIVATE_SETTING_KEYS = ["pin", "pinFailures"] as const;

const settingRowSchema = z.object({ key: z.string().min(1), value: z.unknown() });
export type SettingRow = z.infer<typeof settingRowSchema>;

const backupSchema = z.object({
  app: z.literal("boveda"),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    settings: z.array(settingRowSchema),
    // Los respaldos v1 no traen estas tablas.
    accounts: z.array(accountSchema).optional(),
    categories: z.array(categorySchema).optional(),
    transactions: z.array(transactionSchema).optional(),
  }),
});

export type BackupTables = {
  settings: SettingRow[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

export type BackupFile = { app: "boveda"; version: number; exportedAt: string; data: BackupTables };

function isPrivate(key: string): boolean {
  return (PRIVATE_SETTING_KEYS as readonly string[]).includes(key);
}

export function buildBackup(tables: BackupTables, now: Date): BackupFile {
  return {
    app: "boveda",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { ...tables, settings: tables.settings.filter((row) => !isPrivate(row.key)) },
  };
}

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

const NOT_A_BACKUP = "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste.";
const DAMAGED = "El respaldo está dañado: tiene movimientos con cuentas o categorías que no existen.";

/** Revisa que cada movimiento apunte a cuentas y categorías del mismo respaldo. */
function hasBrokenReferences(data: BackupTables): boolean {
  const accounts = new Map(data.accounts.map((account) => [account.id, account]));
  const categories = new Set(data.categories.map((category) => category.id));
  return data.transactions.some((transaction) => {
    const from = accounts.get(transaction.accountId);
    const to = transaction.toAccountId === null ? undefined : accounts.get(transaction.toAccountId);
    if (!from || (transaction.toAccountId !== null && !to)) return true;
    if (transaction.categoryId !== null && !categories.has(transaction.categoryId)) return true;
    const currencies = [from.currency, ...(to ? [to.currency] : [])];
    return needsFxRate(transaction.currency, currencies) && transaction.fxRate === null;
  });
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
  const tables: BackupTables = {
    settings: data.settings.filter((row) => !isPrivate(row.key)),
    // Un respaldo de antes de Finanzas vuelve con lo que la app trae de inicio.
    accounts: data.accounts ?? defaultAccounts(Number.isNaN(exportedAt) ? 0 : exportedAt),
    categories: data.categories ?? DEFAULT_CATEGORIES,
    transactions: data.transactions ?? [],
  };
  if (hasBrokenReferences(tables)) return { ok: false, error: DAMAGED };
  return { ok: true, backup: { app: "boveda", version: parsed.data.version, exportedAt: parsed.data.exportedAt, data: tables } };
}

/** "boveda-respaldo-2026-11-05.json", con la fecha de Cancún. */
export function backupFileName(now: Date): string {
  return `boveda-respaldo-${todayInCancun(now)}.json`;
}
