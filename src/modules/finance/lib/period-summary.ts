import Big from "big.js";
import {
  addDaysToIsoDate,
  cancunInstant,
  daysBetweenInclusive,
  monthRange,
  shiftMonth,
  todayInCancun,
  weekRange,
  type IsoDate,
} from "@/lib/dates";
import { roundHalfUp } from "@/lib/money";
import type { Category, Transaction } from "../types";
import { amountInMxn } from "./balances";
import { spendingByRootCategory } from "./budgets";
import { inRange, percentChange, periodTotals, type DateRange, type PeriodTotals } from "./summary";

/**
 * Resúmenes semanal y mensual. El semanal (lunes a domingo) aparece el domingo a las 20:00 y
 * el mensual el día 1 a las 9:00, hora de Cancún.
 */

export type SummaryKind = "semanal" | "mensual";

export function periodFor(kind: SummaryKind, date: IsoDate): DateRange {
  return kind === "semanal" ? weekRange(date) : monthRange(date);
}

export function shiftPeriod(kind: SummaryKind, range: DateRange, delta: number): DateRange {
  return kind === "semanal"
    ? weekRange(addDaysToIsoDate(range.start, 7 * delta))
    : monthRange(`${shiftMonth(range.start.slice(0, 7), delta)}-01`);
}

/** Cuándo queda listo el resumen del periodo. */
export function publishedAt(kind: SummaryKind, range: DateRange): Date {
  return kind === "semanal" ? cancunInstant(range.end, 20) : cancunInstant(addDaysToIsoDate(range.end, 1), 9);
}

/** El último periodo cuyo resumen ya está listo. */
export function latestPublished(kind: SummaryKind, now: Date): DateRange {
  let range = periodFor(kind, todayInCancun(now));
  while (publishedAt(kind, range) > now) range = shiftPeriod(kind, range, -1);
  return range;
}

export type CategoryShare = { categoryId: string; cents: number; share: number };

export type PeriodSummary = {
  kind: SummaryKind;
  range: DateRange;
  totals: PeriodTotals;
  previous: PeriodTotals;
  /** Gasto contra el periodo anterior. */
  expenseChange: number | null;
  incomeChange: number | null;
  /** Gasto promedio de los 4 periodos anteriores que tuvieron movimientos. */
  averageExpenseCents: number | null;
  expenseVsAverage: number | null;
  /** Las 5 categorías con más gasto. */
  topCategories: CategoryShare[];
  /** Días contados: el periodo completo o, si va en curso, hasta hoy. */
  days: number;
  dailyAverageCents: number;
  maxDay: { date: IsoDate; cents: number } | null;
  /** Solo mensual: el mismo mes del año anterior, si tuvo movimientos. */
  lastYear: PeriodTotals | null;
  expenseVsLastYear: number | null;
};

type Summable = Pick<Transaction, "type" | "amountCents" | "currency" | "fxRate" | "date" | "categoryId">;

export function summarizePeriod(
  kind: SummaryKind,
  range: DateRange,
  transactions: Summable[],
  categories: Category[],
  today: IsoDate,
): PeriodSummary {
  const totals = periodTotals(transactions, range);
  const previous = periodTotals(transactions, shiftPeriod(kind, range, -1));

  const earlier = [1, 2, 3, 4]
    .map((back) => periodTotals(transactions, shiftPeriod(kind, range, -back)))
    .filter((item) => item.count > 0);
  const averageExpenseCents =
    earlier.length > 0
      ? roundHalfUp(new Big(earlier.reduce((sum, item) => sum + item.expenseCents, 0)).div(earlier.length))
      : null;

  const spent = spendingByRootCategory(transactions, categories, range);
  const topCategories = [...spent]
    .map(([categoryId, cents]) => ({ categoryId, cents, share: totals.expenseCents > 0 ? cents / totals.expenseCents : 0 }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);

  const byDay = new Map<IsoDate, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "gasto" || !inRange(transaction.date, range)) continue;
    byDay.set(transaction.date, (byDay.get(transaction.date) ?? 0) + amountInMxn(transaction));
  }
  let maxDay: PeriodSummary["maxDay"] = null;
  for (const [date, cents] of byDay) {
    if (!maxDay || cents > maxDay.cents || (cents === maxDay.cents && date < maxDay.date)) maxDay = { date, cents };
  }

  const days = Math.max(1, daysBetweenInclusive(range.start, today < range.end ? today : range.end));

  let lastYear: PeriodTotals | null = null;
  if (kind === "mensual") {
    const sameMonth = periodTotals(transactions, monthRange(`${shiftMonth(range.start.slice(0, 7), -12)}-01`));
    lastYear = sameMonth.count > 0 ? sameMonth : null;
  }

  return {
    kind,
    range,
    totals,
    previous,
    expenseChange: percentChange(totals.expenseCents, previous.expenseCents),
    incomeChange: percentChange(totals.incomeCents, previous.incomeCents),
    averageExpenseCents,
    expenseVsAverage: averageExpenseCents === null ? null : percentChange(totals.expenseCents, averageExpenseCents),
    topCategories,
    days,
    dailyAverageCents: roundHalfUp(new Big(totals.expenseCents).div(days)),
    maxDay,
    lastYear,
    expenseVsLastYear: lastYear ? percentChange(totals.expenseCents, lastYear.expenseCents) : null,
  };
}
