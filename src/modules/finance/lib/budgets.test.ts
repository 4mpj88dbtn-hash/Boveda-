import { describe, expect, it } from "vitest";
import { monthRange } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "../defaults";
import type { Category } from "../types";
import {
  applyBudgetRule,
  averageMonthlyIncome,
  budgetLevel,
  budgetStatuses,
  DEFAULT_BUDGET_RULE,
  thresholdCrossed,
} from "./budgets";
import { movement } from "./test-data";

const tacos: Category = { ...DEFAULT_CATEGORIES[0]!, id: "gasto-comida-tacos", name: "Tacos", parentId: "gasto-comida" };
const categories = [...DEFAULT_CATEGORIES, tacos];
const november = monthRange("2026-11-01");

describe("budgetLevel", () => {
  it("avisa desde el 80% y marca excedido desde el 100%", () => {
    expect(budgetLevel(79_999, 100_000)).toBe("ok");
    expect(budgetLevel(80_000, 100_000)).toBe("alerta");
    expect(budgetLevel(99_999, 100_000)).toBe("alerta");
    expect(budgetLevel(100_000, 100_000)).toBe("excedido");
  });
});

describe("budgetStatuses", () => {
  it("suma las subcategorías en su categoría y deja fuera otros meses", () => {
    // Comida $4,000: 2,500 (comida) + 900 (tacos, subcategoría) = 3,400 → 85%, quedan $600.
    const transactions = [
      movement({ type: "gasto", amountCents: 250_000, categoryId: "gasto-comida", date: "2026-11-02" }),
      movement({ type: "gasto", amountCents: 90_000, categoryId: "gasto-comida-tacos", date: "2026-11-20" }),
      movement({ type: "gasto", amountCents: 500_000, categoryId: "gasto-comida", date: "2026-10-31" }),
      movement({ type: "ingreso", amountCents: 900_000, categoryId: "ingreso-salario", date: "2026-11-01" }),
    ];
    const budgets = [{ categoryId: "gasto-comida", amountCents: 400_000, createdAt: 0, updatedAt: 0 }];
    expect(budgetStatuses(budgets, transactions, categories, november)).toEqual([
      { categoryId: "gasto-comida", limitCents: 400_000, spentCents: 340_000, ratio: 0.85, level: "alerta", remainingCents: 60_000 },
    ]);
  });
});

describe("thresholdCrossed", () => {
  it("solo avisa al cruzar el 80% o el 100%", () => {
    expect(thresholdCrossed(70_000, 85_000, 100_000)).toBe(80);
    expect(thresholdCrossed(85_000, 101_000, 100_000)).toBe(100);
    expect(thresholdCrossed(70_000, 120_000, 100_000)).toBe(100);
    expect(thresholdCrossed(81_000, 90_000, 100_000)).toBeNull();
    expect(thresholdCrossed(10_000, 20_000, 100_000)).toBeNull();
  });
});

describe("averageMonthlyIncome", () => {
  it("promedia los meses completos anteriores que tuvieron ingresos", () => {
    // Agosto 30,000 y octubre 20,000 (septiembre sin ingresos): (30,000 + 20,000) ÷ 2 = 25,000.
    const transactions = [
      movement({ type: "ingreso", amountCents: 3_000_000, categoryId: "ingreso-salario", date: "2026-08-15" }),
      movement({ type: "ingreso", amountCents: 2_000_000, categoryId: "ingreso-salario", date: "2026-10-15" }),
      movement({ type: "ingreso", amountCents: 9_900_000, categoryId: "ingreso-salario", date: "2026-11-01" }),
    ];
    expect(averageMonthlyIncome(transactions, "2026-11-05")).toEqual({ cents: 2_500_000, months: 2 });
    expect(averageMonthlyIncome([], "2026-11-05")).toBeNull();
  });
});

describe("applyBudgetRule", () => {
  it("reparte el ingreso 50/30/20 y compara con lo gastado", () => {
    // Ingreso base $20,000 → límites $10,000 / $6,000 / $4,000.
    // Noviembre: ingreso 20,000; súper 7,000 (necesidad), restaurantes 2,500 (deseo),
    // pago de deudas 3,000 (grupo ahorro), otros 500 (sin grupo).
    // Queda para ahorro: 20,000 − 7,000 − 2,500 − 500 = 10,000 (el pago de deudas cuenta ahí).
    const transactions = [
      movement({ type: "ingreso", amountCents: 2_000_000, categoryId: "ingreso-salario", date: "2026-11-01" }),
      movement({ type: "gasto", amountCents: 700_000, categoryId: "gasto-super", date: "2026-11-03" }),
      movement({ type: "gasto", amountCents: 250_000, categoryId: "gasto-restaurantes", date: "2026-11-04" }),
      movement({ type: "gasto", amountCents: 300_000, categoryId: "gasto-deudas", date: "2026-11-04" }),
      movement({ type: "gasto", amountCents: 50_000, categoryId: "gasto-otros", date: "2026-11-04" }),
    ];
    expect(applyBudgetRule(DEFAULT_BUDGET_RULE, 2_000_000, transactions, categories, november)).toEqual({
      incomeCents: 2_000_000,
      needs: { percent: 50, limitCents: 1_000_000, actualCents: 700_000 },
      wants: { percent: 30, limitCents: 600_000, actualCents: 250_000 },
      savings: { percent: 20, limitCents: 400_000, actualCents: 1_000_000 },
      ungroupedCents: 50_000,
    });
  });

  it("redondea los límites al centavo, mitades hacia arriba", () => {
    // $333.33 × 30% = 99.999 → $100.00; × 50% = 166.665 → $166.67.
    const breakdown = applyBudgetRule(DEFAULT_BUDGET_RULE, 33_333, [], categories, november);
    expect(breakdown.wants.limitCents).toBe(10_000);
    expect(breakdown.needs.limitCents).toBe(16_667);
  });
});
