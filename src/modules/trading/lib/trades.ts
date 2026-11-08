import Big from "big.js";
import { todayInCancun, weekRange } from "@/lib/dates";
import { roundHalfUp } from "@/lib/money";
import type { Trade, TradingRules } from "../types";

/**
 * Cuentas de una operación: resultado, riesgo, tamaño de posición y límites de pérdida.
 * Precios y títulos son texto decimal (big.js); el dinero sale en centavos, redondeado una
 * sola vez (mitades hacia arriba).
 */

type Priced = Pick<Trade, "direction" | "entryPrice" | "quantity" | "feesCents">;

/** Ganancia o pérdida en centavos: (Salida − Entrada) × títulos − comisiones. En cortos, al revés. */
export function tradePnlCents(trade: Priced, exitPrice: string): number {
  const move = new Big(exitPrice).minus(trade.entryPrice).times(trade.direction === "largo" ? 1 : -1);
  return roundHalfUp(move.times(trade.quantity).times(100)) - trade.feesCents;
}

/** Resultado de una operación cerrada (null si sigue abierta). */
export function closedPnlCents(trade: Trade): number | null {
  return trade.exitPrice === null ? null : tradePnlCents(trade, trade.exitPrice);
}

/** Riesgo inicial: |Entrada − Stop| × títulos, en centavos. */
export function initialRiskCents(trade: Pick<Trade, "entryPrice" | "stopLoss" | "quantity">): number {
  return roundHalfUp(new Big(trade.entryPrice).minus(trade.stopLoss).abs().times(trade.quantity).times(100));
}

/** Resultado en R: cuántas veces lo que arriesgabas ganaste (o perdiste). */
export function rMultiple(pnlCents: number, riskCents: number): number | null {
  return riskCents > 0 ? pnlCents / riskCents : null;
}

/** Dinero comprometido en la posición: títulos × entrada, en centavos. */
export function notionalCents(trade: Pick<Trade, "entryPrice" | "quantity">): number {
  return roundHalfUp(new Big(trade.entryPrice).times(trade.quantity).times(100));
}

/** Un precio publicado (número) como texto con hasta 6 decimales: 612.35 → "612.35". */
export function priceText(value: number): string {
  return new Big(value).toFixed(6, Big.roundHalfUp).replace(/0+$/, "").replace(/\.$/, "");
}

export type SimAccountState = {
  capitalCents: number;
  /** Suma de lo ganado y perdido en operaciones cerradas. */
  realizedCents: number;
  /** Capital + resultado de las cerradas. Sobre esto se calcula el riesgo. */
  equityCents: number;
  /** Dinero puesto en posiciones abiertas. */
  committedCents: number;
  /** Lo que queda para abrir operaciones (sin apalancamiento). */
  availableCents: number;
  /** Ganancia o pérdida de las abiertas al último precio (null si falta algún precio). */
  unrealizedCents: number | null;
  openCount: number;
};

/** Estado de la cuenta del simulador con los últimos precios publicados. */
export function simAccountState(capitalCents: number, trades: Trade[], prices: Record<string, number | undefined>): SimAccountState {
  const sim = trades.filter((trade) => trade.account === "simulador");
  let realizedCents = 0;
  let committedCents = 0;
  let unrealizedCents: number | null = 0;
  let openCount = 0;
  for (const trade of sim) {
    if (trade.status === "cerrada") {
      realizedCents += closedPnlCents(trade) ?? 0;
      continue;
    }
    openCount += 1;
    committedCents += notionalCents(trade);
    const price = trade.assetId ? prices[trade.assetId] : undefined;
    if (price === undefined || unrealizedCents === null) unrealizedCents = null;
    else unrealizedCents += tradePnlCents(trade, priceText(price));
  }
  const equityCents = capitalCents + realizedCents;
  return { capitalCents, realizedCents, equityCents, committedCents, availableCents: equityCents - committedCents, unrealizedCents, openCount };
}

/** Lo máximo que permite arriesgar tu regla en una operación: capital × % de riesgo, en centavos. */
export function maxRiskCents(equityCents: number, riskPercent: number): number {
  return Math.max(0, roundHalfUp(new Big(equityCents).times(riskPercent).div(100)));
}

export type SizeSuggestion = {
  /** Títulos sugeridos, como texto. */
  quantity: string;
  /** Lo que arriesgas con esos títulos. */
  riskCents: number;
  /** Lo máximo que permite tu regla (capital × % de riesgo). */
  maxRiskCents: number;
  /** Qué limitó el tamaño: tu regla de riesgo o el dinero disponible. */
  limitedBy: "riesgo" | "efectivo";
};

function trimDecimal(value: Big, decimals: number): string {
  const text = value.toFixed(decimals, Big.roundDown);
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/**
 * Tamaño de posición con la regla de riesgo: Títulos = (Capital × % de riesgo) / |Entrada − Stop|,
 * sin pasar del dinero disponible. Se redondea hacia abajo (`decimals` = 0 para acciones y ETFs).
 */
export function suggestSize(input: {
  equityCents: number;
  availableCents: number;
  riskPercent: number;
  entry: string;
  stop: string;
  decimals: number;
}): SizeSuggestion | null {
  const perUnitCents = new Big(input.entry).minus(input.stop).abs().times(100);
  if (perUnitCents.eq(0) || input.equityCents <= 0 || input.availableCents <= 0) return null;
  const maxRisk = new Big(input.equityCents).times(input.riskPercent).div(100);
  const byRisk = new Big(trimDecimal(maxRisk.div(perUnitCents), input.decimals));
  const byCash = new Big(trimDecimal(new Big(input.availableCents).div(new Big(input.entry).times(100)), input.decimals));
  const limitedBy = byRisk.lte(byCash) ? "riesgo" : "efectivo";
  const quantity = limitedBy === "riesgo" ? byRisk : byCash;
  if (quantity.lte(0)) return null;
  return {
    quantity: trimDecimal(quantity, input.decimals),
    riskCents: roundHalfUp(quantity.times(perUnitCents)),
    maxRiskCents: maxRiskCents(input.equityCents, input.riskPercent),
    limitedBy,
  };
}

/** Revisa los títulos que escribiste contra tu regla de riesgo y tu dinero disponible. */
export function quantityProblem(input: {
  quantity: string;
  entry: string;
  stop: string;
  maxRiskCents: number;
  availableCents: number;
}): "vacio" | "riesgo" | "efectivo" | null {
  let quantity: Big;
  try {
    quantity = new Big(input.quantity);
  } catch {
    return "vacio";
  }
  if (quantity.lte(0)) return "vacio";
  const risk = roundHalfUp(quantity.times(new Big(input.entry).minus(input.stop).abs()).times(100));
  if (risk > input.maxRiskCents) return "riesgo";
  if (roundHalfUp(quantity.times(input.entry).times(100)) > input.availableCents) return "efectivo";
  return null;
}

export type LimitState = { pnlCents: number; limitCents: number; reached: boolean };
export type LossLimits = { day: LimitState; week: LimitState; blocked: "dia" | "semana" | null };

/**
 * Límites de pérdida del simulador. El límite del día es un % del capital con que empezó el
 * día (hora de Cancún); el de la semana, del capital del lunes. Cuentan las operaciones
 * cerradas: al llegar al límite no se abren más hasta el día (o la semana) siguiente.
 */
export function lossLimits(
  capitalCents: number,
  trades: Trade[],
  rules: Pick<TradingRules, "dailyLossPercent" | "weeklyLossPercent">,
  now: Date,
): LossLimits {
  const today = todayInCancun(now);
  const weekStart = weekRange(today).start;
  let beforeToday = 0;
  let beforeWeek = 0;
  let dayPnl = 0;
  let weekPnl = 0;
  for (const trade of trades) {
    if (trade.account !== "simulador" || trade.closedAt === null) continue;
    const pnl = closedPnlCents(trade) ?? 0;
    const date = todayInCancun(new Date(trade.closedAt));
    if (date > today) continue;
    if (date < weekStart) beforeWeek += pnl;
    else weekPnl += pnl;
    if (date < today) beforeToday += pnl;
    else dayPnl += pnl;
  }
  const state = (startCents: number, percent: number, pnlCents: number): LimitState => {
    const limitCents = Math.max(0, roundHalfUp(new Big(startCents).times(percent).div(100)));
    return { pnlCents, limitCents, reached: startCents <= 0 || pnlCents <= -limitCents };
  };
  const day = state(capitalCents + beforeToday, rules.dailyLossPercent, dayPnl);
  const week = state(capitalCents + beforeWeek, rules.weeklyLossPercent, weekPnl);
  return { day, week, blocked: week.reached ? "semana" : day.reached ? "dia" : null };
}
