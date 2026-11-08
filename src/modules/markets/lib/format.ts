import type { AssetUnit } from "../catalog";

/** Formato de precios de mercado (son análisis, no dinero del usuario). */

const number = (value: number, digits: number) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** Decimales según la unidad y el tamaño: el tipo de cambio lleva 4. */
export function quoteDigits(unit: AssetUnit, value: number): number {
  if (unit === "MXN" && Math.abs(value) < 100) return 4;
  if (unit === "%") return 2;
  return Math.abs(value) < 1 ? 4 : 2;
}

export function formatQuote(value: number, unit: AssetUnit): string {
  const text = number(value, quoteDigits(unit, value));
  switch (unit) {
    case "USD":
      return `USD ${text}`;
    case "MXN":
      return `$${text}`;
    case "%":
      return `${text}%`;
    case "pts":
      return text;
  }
}

export type Change = { absolute: number; percent: number | null };

export function quoteChange(price: number, previous: number | null): Change | null {
  if (previous === null) return null;
  return { absolute: price - previous, percent: previous === 0 ? null : (price - previous) / previous };
}

/** "+12.34 (+0.17%)"; en tasas, puntos porcentuales: "+0.05 pp". */
export function formatChange(change: Change, unit: AssetUnit, reference: number): string {
  const sign = change.absolute > 0 ? "+" : change.absolute < 0 ? "−" : "";
  const digits = quoteDigits(unit, reference);
  const absolute = `${sign}${number(Math.abs(change.absolute), digits)}`;
  if (unit === "%") return `${absolute} pp`;
  if (change.percent === null) return absolute;
  const percentSign = change.percent > 0 ? "+" : change.percent < 0 ? "−" : "";
  return `${absolute} (${percentSign}${number(Math.abs(change.percent) * 100, 2)}%)`;
}
