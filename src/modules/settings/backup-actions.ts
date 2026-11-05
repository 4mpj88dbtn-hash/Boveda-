"use client";

import { backupFileName, buildBackup, type BackupFile } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { saveFile } from "@/lib/save-file";
import { parseSetting, setSetting, SETTING_KEYS, type SettingKey } from "@/lib/settings";

/** Arma el respaldo con todo lo guardado (sin el PIN) y lo entrega al usuario. */
export async function downloadBackup(): Promise<"compartido" | "descargado" | "cancelado"> {
  const now = new Date();
  const settings = await getDb().settings.toArray();
  const backup = buildBackup({ settings }, now);
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(now), { type: "application/json" });
  const result = await saveFile(file);
  if (result !== "cancelado") await setSetting("lastBackupAt", now.getTime());
  return result;
}

const RESTORABLE_KEYS = SETTING_KEYS.filter((key) => key !== "pin" && key !== "pinFailures");

/** Reemplaza los datos actuales por los del respaldo. El PIN actual se conserva. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.settings, async () => {
    await db.settings.bulkDelete(RESTORABLE_KEYS);
    for (const row of backup.data.settings) {
      if (!(RESTORABLE_KEYS as string[]).includes(row.key)) continue;
      const key = row.key as SettingKey;
      const value = parseSetting(key, row.value);
      if (value !== undefined) await db.settings.put({ key, value });
    }
  });
}
