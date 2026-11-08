import { ALL_ASSETS, type Asset } from "@/modules/markets/catalog";
import { nyseStatus } from "@/modules/markets/lib/market-hours";
import type { Quote } from "@/modules/markets/lib/schema";

/**
 * Qué se puede operar en el simulador y cuándo. La cuenta ficticia es en dólares: ETFs,
 * acciones de EE. UU. y cripto, con el último precio que publica GitHub Actions.
 */

export const TRADABLE_ASSETS: Asset[] = ALL_ASSETS.filter(
  (asset) => !asset.soloHistoria && asset.unidad === "USD" && (asset.tipo === "etf" || asset.tipo === "accion" || asset.tipo === "cripto"),
);

/** Acciones y ETFs en títulos enteros; cripto con fracciones (hasta 6 decimales). */
export function quantityDecimals(asset: Asset): number {
  return asset.tipo === "cripto" ? 6 : 0;
}

/** Antigüedad máxima del precio para operar: con la bolsa abierta se publica cada 20 minutos. */
export const MAX_QUOTE_AGE_MIN = { bolsa: 45, cripto: 240 } as const;

export type Tradability = { ok: true; ageMinutes: number } | { ok: false; reason: "sin-precio" | "bolsa-cerrada" | "precio-viejo"; ageMinutes: number | null };

/**
 * ¿Se puede abrir o cerrar ahora? Acciones y ETFs solo con la Bolsa de Nueva York abierta
 * (horario regular); cripto, a toda hora. En los dos casos el precio debe ser reciente.
 */
export function tradability(asset: Asset, quote: Quote | undefined, now: Date): Tradability {
  if (!quote?.hora) return { ok: false, reason: "sin-precio", ageMinutes: null };
  const ageMinutes = Math.max(0, Math.round((now.getTime() - Date.parse(quote.hora)) / 60_000));
  if (asset.tipo !== "cripto") {
    if (nyseStatus(now).state !== "abierto") return { ok: false, reason: "bolsa-cerrada", ageMinutes };
    if (ageMinutes > MAX_QUOTE_AGE_MIN.bolsa) return { ok: false, reason: "precio-viejo", ageMinutes };
  } else if (ageMinutes > MAX_QUOTE_AGE_MIN.cripto) {
    return { ok: false, reason: "precio-viejo", ageMinutes };
  }
  return { ok: true, ageMinutes };
}
