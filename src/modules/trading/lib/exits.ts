import type { Candle } from "@/modules/markets/lib/schema";
import type { Trade } from "../types";
import { priceText } from "./trades";

/**
 * Cierre automático del simulador: revisa las velas publicadas después de la entrada y
 * encuentra la primera que tocó el stop o el objetivo. Si una vela toca los dos, se supone
 * el stop (lo prudente: no sabemos cuál pasó primero). Si el precio abre más allá del stop o
 * del objetivo (un hueco), la salida es a ese precio de apertura.
 */

export type Bar = { t: number; o: number; h: number; l: number; c: number };

const DAY_MS = 86_400_000;
const THIRTY_MIN_MS = 30 * 60_000;

const toBar = ([t, o, h, l, c]: Candle): Bar => ({ t: t * 1000, o, h, l, c });
const byTime = (a: Bar, b: Bar) => a.t - b.t;

/**
 * Une las velas usando la más fina disponible en cada tramo: diarias (5 años), de 30 minutos
 * (últimos 5 días) y de 5 minutos (último día), sin que se encimen.
 */
export function mergeBars(daily: Candle[], thirtyMin: Candle[], fiveMin: Candle[]): Bar[] {
  const five = fiveMin.map(toBar).sort(byTime);
  const firstFive = five[0]?.t ?? Number.POSITIVE_INFINITY;
  const thirty = thirtyMin.map(toBar).filter((bar) => bar.t + THIRTY_MIN_MS <= firstFive).sort(byTime);
  const firstFine = thirty[0]?.t ?? firstFive;
  const days = daily.map(toBar).filter((bar) => bar.t + DAY_MS <= firstFine).sort(byTime);
  return [...days, ...thirty, ...five];
}

export type Exit = { price: string; at: number; reason: "stop" | "objetivo" };

/** Primera salida por stop u objetivo en las velas que empezaron después de la entrada. */
export function findExit(trade: Pick<Trade, "direction" | "stopLoss" | "target" | "openedAt">, bars: Bar[]): Exit | null {
  const stop = Number(trade.stopLoss);
  const target = trade.target === null ? null : Number(trade.target);
  const long = trade.direction === "largo";
  // Del lado del stop "peor" es abajo en largos y arriba en cortos.
  const beyondStop = (price: number) => (long ? price <= stop : price >= stop);
  const beyondTarget = (price: number) => target !== null && (long ? price >= target : price <= target);

  for (const bar of bars) {
    if (bar.t < trade.openedAt) continue;
    if (beyondStop(bar.o)) return { price: priceText(bar.o), at: bar.t, reason: "stop" };
    if (beyondTarget(bar.o)) return { price: priceText(bar.o), at: bar.t, reason: "objetivo" };
    if (beyondStop(long ? bar.l : bar.h)) return { price: trade.stopLoss, at: bar.t, reason: "stop" };
    if (trade.target !== null && beyondTarget(long ? bar.h : bar.l)) return { price: trade.target, at: bar.t, reason: "objetivo" };
  }
  return null;
}
