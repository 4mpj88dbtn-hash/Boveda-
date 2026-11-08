"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { z } from "zod";
import { getDb } from "./db";
import { ISO_DATE_PATTERN, RATE_PATTERN } from "@/modules/finance/types";
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
  /** Último tipo de cambio que escribiste: pesos por 1 dólar, con su fecha y su fuente. */
  usdMxnRate: z.object({
    rate: z.string().regex(RATE_PATTERN),
    date: z.string().regex(ISO_DATE_PATTERN),
    source: z.string().min(1).max(60),
  }),
  /** Plantilla 50/30/20: ingreso base (null = tu promedio real) y porcentajes. */
  budgetRule: z
    .object({
      incomeCents: z.number().int().positive().nullable(),
      needs: z.number().int().min(0).max(100),
      wants: z.number().int().min(0).max(100),
      savings: z.number().int().min(0).max(100),
    })
    .refine((rule) => rule.needs + rule.wants + rule.savings === 100),
  /** Último resumen que abriste: inicio de la semana y mes ("aaaa-mm"). */
  summariesSeen: z.object({
    weekly: z.string().regex(ISO_DATE_PATTERN).nullable(),
    monthly: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  }),
  /** Hasta cuándo no mostrar el recordatorio de respaldo. */
  backupReminderSnoozedUntil: z.number(),
  /** Activos extra que sigues en Mercados (ids del catálogo). */
  watchlist: z.array(z.string().min(1).max(40)).max(40),
  /** Alertas de precio guardadas en el dispositivo. */
  priceAlerts: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        assetId: z.string().min(1).max(40),
        condition: z.enum(["mayor", "menor"]),
        value: z.number().positive(),
        createdAt: z.number(),
      }),
    )
    .max(50),
  /** Noticias ya leídas (ids) y guardadas (copia completa, para que no se pierdan). */
  newsRead: z.array(z.string().max(40)).max(500),
  newsSaved: z
    .array(
      z.object({
        id: z.string(),
        titulo: z.string(),
        enlace: z.string(),
        fuente: z.string(),
        fecha: z.string().nullable(),
        guardadaEn: z.number(),
      }),
    )
    .max(100),
  /** Lo que elegiste para los avisos de Telegram (se copia a la variable SENALES_CONFIG). */
  telegramConfig: z.object({
    preapertura: z.boolean(),
    cierre: z.boolean(),
    movimientos: z.boolean(),
    umbrales: z.record(z.string(), z.number().positive()),
    noticias: z.boolean(),
    alertasPrecio: z.array(z.object({ id: z.string(), condicion: z.enum(["mayor", "menor"]), valor: z.number() })),
    aportacionDia: z.number().int().min(1).max(28).nullable(),
    silencioDesde: z.number().int().min(0).max(23),
    silencioHasta: z.number().int().min(0).max(23),
    maxPorHora: z.number().int().min(1).max(30),
    prioridades: z.array(z.enum(["critica", "importante", "informativa"])).min(1),
  }),
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
