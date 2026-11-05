"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { z } from "zod";
import { getDb } from "./db";
import { LOCK_POLICIES } from "./lock/policy";

/** Ajustes guardados en el celular, cada uno validado al leerlo. */
const settingSchemas = {
  displayName: z.string().trim().max(40),
  lockPolicy: z.enum(LOCK_POLICIES),
  pin: z.object({
    algorithm: z.literal("PBKDF2-SHA256"),
    iterations: z.number().int().positive(),
    salt: z.string().min(1),
    hash: z.string().min(1),
  }),
  pinFailures: z.object({ count: z.number().int().min(0), lastAt: z.number() }),
  createdAt: z.number(),
  lastBackupAt: z.number(),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };

export const SETTING_KEYS = Object.keys(settingSchemas) as SettingKey[];

export function parseSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] | undefined {
  const parsed = settingSchemas[key].safeParse(value);
  return parsed.success ? (parsed.data as Settings[K]) : undefined;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K] | undefined> {
  const row = await getDb().settings.get(key);
  return row ? parseSetting(key, row.value) : undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await getDb().settings.put({ key, value: settingSchemas[key].parse(value) });
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await getDb().settings.delete(key);
}

/**
 * Lee un ajuste y se actualiza solo cuando cambia.
 * Devuelve `undefined` mientras carga y `{ value }` cuando ya leyó (value puede no existir).
 */
export function useSetting<K extends SettingKey>(key: K): { value: Settings[K] | undefined } | undefined {
  return useLiveQuery(async () => ({ value: await getSetting(key) }), [key]);
}
