/**
 * Rendimientos de mercado: periodos, CAGR y comparador "base 100". Los puntos son
 * [segundos UTC, valor] de la serie de cierres, del más viejo al más nuevo.
 */

export type Point = [time: number, value: number];

const DAY = 86_400;

/** El último punto en o antes de `time`. */
export function valueAtOrBefore(points: Point[], time: number): Point | null {
  let found: Point | null = null;
  for (const point of points) {
    if (point[0] > time) break;
    found = point;
  }
  return found;
}

/** Rendimiento simple entre dos valores: final ÷ inicial − 1. */
export function simpleReturn(start: number, end: number): number | null {
  if (start <= 0) return null;
  return end / start - 1;
}

/** CAGR = (final ÷ inicial)^(1 ÷ años) − 1, con años = días ÷ 365.25. */
export function cagr(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  return (end / start) ** (1 / years) - 1;
}

export type ReturnPeriod = "1M" | "3M" | "YTD" | "1A" | "3A" | "5A";

export const RETURN_PERIODS: ReturnPeriod[] = ["1M", "3M", "YTD", "1A", "3A", "5A"];

/** Inicio de cada periodo, contado hacia atrás desde la fecha del último dato (UTC). */
export function periodStart(period: ReturnPeriod, last: number): number {
  const date = new Date(last * 1000);
  const shift = (months: number) => {
    const copy = new Date(date);
    copy.setUTCMonth(copy.getUTCMonth() - months);
    return Math.floor(copy.getTime() / 1000);
  };
  switch (period) {
    case "1M":
      return shift(1);
    case "3M":
      return shift(3);
    case "YTD":
      // Cierre del último día del año anterior.
      return Math.floor(Date.UTC(date.getUTCFullYear(), 0, 1) / 1000) - 1;
    case "1A":
      return shift(12);
    case "3A":
      return shift(36);
    case "5A":
      return shift(60);
  }
}

export type PeriodReturn = { period: ReturnPeriod; value: number | null; annualized: number | null };

/** Rendimiento de cada periodo; de 1 año en adelante también anualizado (CAGR). */
export function periodReturns(points: Point[]): PeriodReturn[] {
  const last = points.at(-1);
  const first = points[0];
  if (!last || !first) return RETURN_PERIODS.map((period) => ({ period, value: null, annualized: null }));
  return RETURN_PERIODS.map((period) => {
    const start = periodStart(period, last[0]);
    // Sin datos suficientemente viejos no se calcula.
    if (first[0] > start + 7 * DAY) return { period, value: null, annualized: null };
    const base = valueAtOrBefore(points, start) ?? first;
    const value = simpleReturn(base[1], last[1]);
    const years = (last[0] - base[0]) / (365.25 * DAY);
    const annualized = years >= 1 ? cagr(base[1], last[1], years) : null;
    return { period, value, annualized };
  });
}

/** Normaliza una serie para que valga 100 en `from` (o en su primer dato después). */
export function base100(points: Point[], from: number): Point[] {
  const start = points.find((point) => point[0] >= from);
  if (!start || start[1] <= 0) return [];
  return points.filter((point) => point[0] >= start[0]).map(([time, value]) => [time, (value / start[1]) * 100]);
}
