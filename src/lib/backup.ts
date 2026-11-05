import { z } from "zod";
import { todayInCancun } from "./dates";

/**
 * Respaldo de Bóveda: un archivo JSON con todos tus datos. El PIN y los intentos fallidos
 * nunca se incluyen. Cada versión nueva del formato debe poder leer las anteriores.
 */

export const BACKUP_VERSION = 1;

/** Ajustes que nunca salen del celular. */
export const PRIVATE_SETTING_KEYS = ["pin", "pinFailures"] as const;

const settingRowSchema = z.object({ key: z.string().min(1), value: z.unknown() });
export type SettingRow = z.infer<typeof settingRowSchema>;

const backupSchema = z.object({
  app: z.literal("boveda"),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({ settings: z.array(settingRowSchema) }),
});

export type BackupFile = z.infer<typeof backupSchema>;

export type BackupTables = { settings: SettingRow[] };

function isPrivate(key: string): boolean {
  return (PRIVATE_SETTING_KEYS as readonly string[]).includes(key);
}

export function buildBackup(tables: BackupTables, now: Date): BackupFile {
  return {
    app: "boveda",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { settings: tables.settings.filter((row) => !isPrivate(row.key)) },
  };
}

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste." };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste." };
  }
  if (parsed.data.version > BACKUP_VERSION) {
    return { ok: false, error: "Este respaldo es de una versión más nueva de Bóveda. Actualiza la app y vuelve a intentar." };
  }
  const settings = parsed.data.data.settings.filter((row) => !isPrivate(row.key));
  return { ok: true, backup: { ...parsed.data, data: { settings } } };
}

/** "boveda-respaldo-2026-11-05.json", con la fecha de Cancún. */
export function backupFileName(now: Date): string {
  return `boveda-respaldo-${todayInCancun(now)}.json`;
}
