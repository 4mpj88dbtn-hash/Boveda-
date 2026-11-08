"use client";

import { backupFileName, buildBackup, type BackupFile } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { saveFile } from "@/lib/save-file";
import { parseSetting, setSetting, SETTING_KEYS, type SettingKey } from "@/lib/settings";

/** Arma el respaldo con todo lo guardado (sin el PIN) y lo entrega al usuario. */
export async function downloadBackup(): Promise<"compartido" | "descargado" | "cancelado"> {
  const now = new Date();
  const db = getDb();
  const [settings, accounts, categories, transactions, budgets, recurring, templates, attachments, purchases, dividends, trades, tradeImages, tradeReviews] = await Promise.all([
    db.settings.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurring.toArray(),
    db.templates.toArray(),
    db.attachments.toArray(),
    db.purchases.toArray(),
    db.dividends.toArray(),
    db.trades.toArray(),
    db.tradeImages.toArray(),
    db.tradeReviews.toArray(),
  ]);
  const backup = buildBackup(
    { settings, accounts, categories, transactions, budgets, recurring, templates, attachments, purchases, dividends, trades, tradeImages, tradeReviews },
    now,
  );
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(now), { type: "application/json" });
  const result = await saveFile(file);
  if (result !== "cancelado") await setSetting("lastBackupAt", now.getTime());
  return result;
}

const RESTORABLE_KEYS = SETTING_KEYS.filter((key) => key !== "pin" && key !== "pinFailures");

/**
 * Reemplaza los datos actuales por los del respaldo, todo o nada: si algo falla, no cambia
 * nada. El PIN actual se conserva.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const db = getDb();
  const { data } = backup;
  const tables = [
    db.settings,
    db.accounts,
    db.categories,
    db.transactions,
    db.budgets,
    db.recurring,
    db.templates,
    db.attachments,
    db.purchases,
    db.dividends,
    db.trades,
    db.tradeImages,
    db.tradeReviews,
  ];
  await db.transaction("rw", tables, async () => {
    await db.settings.bulkDelete(RESTORABLE_KEYS);
    for (const row of data.settings) {
      if (!(RESTORABLE_KEYS as string[]).includes(row.key)) continue;
      const key = row.key as SettingKey;
      const value = parseSetting(key, row.value);
      if (value !== undefined) await db.settings.put({ key, value });
    }
    await Promise.all(tables.slice(1).map((table) => table.clear()));
    await db.accounts.bulkPut(data.accounts);
    await db.categories.bulkPut(data.categories);
    await db.transactions.bulkPut(data.transactions);
    await db.budgets.bulkPut(data.budgets);
    await db.recurring.bulkPut(data.recurring);
    await db.templates.bulkPut(data.templates);
    await db.attachments.bulkPut(data.attachments);
    await db.purchases.bulkPut(data.purchases);
    await db.dividends.bulkPut(data.dividends);
    await db.trades.bulkPut(data.trades);
    await db.tradeImages.bulkPut(data.tradeImages);
    await db.tradeReviews.bulkPut(data.tradeReviews);
  });
}
