import Big from "big.js";
import { monthRange, shiftMonth, type IsoDate } from "@/lib/dates";
import { roundHalfUp } from "@/lib/money";
import type { Budget, Category, Transaction } from "../types";
import { amountInMxn } from "./balances";
import { inRange, periodTotals, type DateRange } from "./summary";

/** Presupuestos mensuales por categoría y la plantilla 50/30/20, todo en pesos. */

type Spending = Pick<Transaction, "type" | "amountCents" | "currency" | "fxRate" | "date" | "categoryId">;

/** Una subcategoría cuenta dentro de su categoría madre. */
export function rootCategoryId(categoryId: string, byId: Map<string, Category>): string {
  return byId.get(categoryId)?.parentId ?? categoryId;
}

/** Gasto de cada categoría madre en el periodo. */
export function spendingByRootCategory(
  transactions: Spending[],
  categories: Category[],
  range: DateRange,
): Map<string, number> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "gasto" || transaction.categoryId === null || !inRange(transaction.date, range)) continue;
    const root = rootCategoryId(transaction.categoryId, byId);
    totals.set(root, (totals.get(root) ?? 0) + amountInMxn(transaction));
  }
  return totals;
}

export type BudgetLevel = "ok" | "alerta" | "excedido";

export type BudgetStatus = {
  categoryId: string;
  limitCents: number;
  spentCents: number;
  /** Gastado ÷ presupuesto (1 = 100%). */
  ratio: number;
  level: BudgetLevel;
  /** Lo que queda; negativo si te pasaste. */
  remainingCents: number;
};

/** Alerta desde el 80% y excedido desde el 100%, con enteros para no redondear mal. */
export function budgetLevel(spentCents: number, limitCents: number): BudgetLevel {
  if (spentCents >= limitCents) return "excedido";
  if (spentCents * 5 >= limitCents * 4) return "alerta";
  return "ok";
}

export function budgetStatuses(
  budgets: Budget[],
  transactions: Spending[],
  categories: Category[],
  range: DateRange,
): BudgetStatus[] {
  const spent = spendingByRootCategory(transactions, categories, range);
  return budgets.map((budget) => {
    const spentCents = spent.get(budget.categoryId) ?? 0;
    return {
      categoryId: budget.categoryId,
      limitCents: budget.amountCents,
      spentCents,
      ratio: spentCents / budget.amountCents,
      level: budgetLevel(spentCents, budget.amountCents),
      remainingCents: budget.amountCents - spentCents,
    };
  });
}

/** Si un gasto nuevo hace cruzar el 80% o el 100%, dice cuál. */
export function thresholdCrossed(beforeCents: number, afterCents: number, limitCents: number): 80 | 100 | null {
  const before = budgetLevel(beforeCents, limitCents);
  const after = budgetLevel(afterCents, limitCents);
  if (after === before) return null;
  if (after === "excedido") return 100;
  if (after === "alerta") return 80;
  return null;
}

/** Promedio de ingresos de los últimos meses completos (sin contar el mes en curso). */
export function averageMonthlyIncome(
  transactions: Spending[],
  today: IsoDate,
  months = 3,
): { cents: number; months: number } | null {
  const current = today.slice(0, 7);
  let total = 0;
  let counted = 0;
  for (let back = 1; back <= months; back += 1) {
    const income = periodTotals(transactions, monthRange(`${shiftMonth(current, -back)}-01`)).incomeCents;
    if (income > 0) {
      total += income;
      counted += 1;
    }
  }
  if (counted === 0) return null;
  return { cents: roundHalfUp(new Big(total).div(counted)), months: counted };
}

export type BudgetRule = { incomeCents: number | null; needs: number; wants: number; savings: number };

export const DEFAULT_BUDGET_RULE: BudgetRule = { incomeCents: null, needs: 50, wants: 30, savings: 20 };

export type RuleLine = { limitCents: number; actualCents: number; percent: number };

export type RuleBreakdown = {
  incomeCents: number;
  needs: RuleLine;
  wants: RuleLine;
  /** Lo que queda para ahorrar, invertir o pagar deudas: ingreso − necesidades − deseos − sin grupo. */
  savings: RuleLine;
  /** Gasto en categorías sin grupo (por ejemplo "Otros gastos"). */
  ungroupedCents: number;
};

/**
 * Plantilla 50/30/20 sobre un ingreso base. El gasto en categorías del grupo "ahorro" (como
 * pagar deudas) cuenta como parte del 20%, no como gasto.
 */
export function applyBudgetRule(
  rule: BudgetRule,
  incomeCents: number,
  transactions: Spending[],
  categories: Category[],
  range: DateRange,
): RuleBreakdown {
  const groupOf = new Map(categories.map((category) => [category.id, category.group]));
  const spent = spendingByRootCategory(transactions, categories, range);
  let needs = 0;
  let wants = 0;
  let ungrouped = 0;
  for (const [categoryId, cents] of spent) {
    const group = groupOf.get(categoryId) ?? null;
    if (group === "necesidades") needs += cents;
    else if (group === "deseos") wants += cents;
    else if (group === null) ungrouped += cents;
  }
  const monthIncome = periodTotals(transactions, range).incomeCents;
  const limit = (percent: number) => roundHalfUp(new Big(incomeCents).times(percent).div(100));
  return {
    incomeCents,
    needs: { percent: rule.needs, limitCents: limit(rule.needs), actualCents: needs },
    wants: { percent: rule.wants, limitCents: limit(rule.wants), actualCents: wants },
    savings: { percent: rule.savings, limitCents: limit(rule.savings), actualCents: monthIncome - needs - wants - ungrouped },
    ungroupedCents: ungrouped,
  };
}
