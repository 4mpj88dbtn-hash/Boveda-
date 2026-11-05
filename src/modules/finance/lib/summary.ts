import type { IsoDate } from "@/lib/dates";
import type { Transaction } from "../types";
import { amountInMxn } from "./balances";

/** Totales de un periodo, siempre en pesos. Las transferencias no son gasto ni ingreso. */

export type DateRange = { start: IsoDate; end: IsoDate };

export function inRange(date: IsoDate, range: DateRange): boolean {
  // Las fechas "aaaa-mm-dd" se pueden comparar como texto.
  return date >= range.start && date <= range.end;
}

export type PeriodTotals = {
  incomeCents: number;
  expenseCents: number;
  /** Ingresos menos gastos. */
  balanceCents: number;
  /** Qué parte de lo que entró te quedó: balance ÷ ingresos. Sin ingresos no se calcula. */
  savingsRate: number | null;
  count: number;
};

type Summable = Pick<Transaction, "type" | "amountCents" | "currency" | "fxRate" | "date">;

export function periodTotals(transactions: Summable[], range: DateRange): PeriodTotals {
  let incomeCents = 0;
  let expenseCents = 0;
  let count = 0;
  for (const transaction of transactions) {
    if (transaction.type === "transferencia" || !inRange(transaction.date, range)) continue;
    count += 1;
    if (transaction.type === "ingreso") incomeCents += amountInMxn(transaction);
    else expenseCents += amountInMxn(transaction);
  }
  const balanceCents = incomeCents - expenseCents;
  return {
    incomeCents,
    expenseCents,
    balanceCents,
    savingsRate: incomeCents > 0 ? balanceCents / incomeCents : null,
    count,
  };
}

/** Variación entre dos periodos: (actual − anterior) ÷ anterior. Sin base no se calcula. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/** Cuánto sumó cada categoría en el periodo, de mayor a menor. */
export function totalsByCategory(
  transactions: (Summable & Pick<Transaction, "categoryId">)[],
  range: DateRange,
  type: "gasto" | "ingreso",
): { categoryId: string; cents: number }[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== type || transaction.categoryId === null || !inRange(transaction.date, range)) continue;
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + amountInMxn(transaction));
  }
  return [...totals]
    .map(([categoryId, cents]) => ({ categoryId, cents }))
    .sort((a, b) => b.cents - a.cents);
}
