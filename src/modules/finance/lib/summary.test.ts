import { describe, expect, it } from "vitest";
import { monthRange, weekRange } from "@/lib/dates";
import { percentChange, periodTotals, totalsByCategory } from "./summary";
import { movement } from "./test-data";

/*
 * Noviembre 2026, verificado a mano (centavos):
 *   Ingresos: 1,500,000 (día 2)
 *   Gastos:   25,000 (día 5) + 36,500 (USD 20.00 × 18.25, día 30) = 61,500
 *   Fuera:    120,000 del 31 de octubre y la transferencia del día 10
 *   Balance:  1,500,000 − 61,500 = 1,438,500; tasa de ahorro 1,438,500 ÷ 1,500,000 = 0.959 (95.9%)
 */
const transactions = [
  movement({ type: "ingreso", amountCents: 1_500_000, date: "2026-11-02", categoryId: "ingreso-honorarios" }),
  movement({ type: "gasto", amountCents: 25_000, date: "2026-11-05", categoryId: "gasto-comida" }),
  movement({
    type: "gasto",
    amountCents: 2_000,
    currency: "USD",
    fxRate: "18.25",
    date: "2026-11-30",
    categoryId: "gasto-restaurantes",
  }),
  movement({ type: "gasto", amountCents: 120_000, date: "2026-10-31" }),
  movement({ type: "transferencia", amountCents: 500_000, date: "2026-11-10", toAccountId: "tarjeta" }),
];

describe("periodTotals", () => {
  it("suma el mes en pesos y deja fuera las transferencias", () => {
    expect(periodTotals(transactions, monthRange("2026-11-15"))).toEqual({
      incomeCents: 1_500_000,
      expenseCents: 61_500,
      balanceCents: 1_438_500,
      savingsRate: 0.959,
      count: 3,
    });
  });

  it("corta la semana de lunes a domingo", () => {
    // Semana del lunes 2 al domingo 8 de noviembre de 2026.
    const totals = periodTotals(transactions, weekRange("2026-11-05"));
    expect(totals.incomeCents).toBe(1_500_000);
    expect(totals.expenseCents).toBe(25_000);
  });

  it("sin ingresos no calcula la tasa de ahorro", () => {
    expect(periodTotals(transactions, monthRange("2026-10-01")).savingsRate).toBeNull();
  });
});

describe("percentChange", () => {
  it("compara contra el periodo anterior", () => {
    // (61,500 − 50,000) ÷ 50,000 = 0.23 → +23%
    expect(percentChange(61_500, 50_000)).toBeCloseTo(0.23, 10);
    expect(percentChange(40_000, 50_000)).toBeCloseTo(-0.2, 10);
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("totalsByCategory", () => {
  it("ordena las categorías de mayor a menor gasto", () => {
    expect(totalsByCategory(transactions, monthRange("2026-11-01"), "gasto")).toEqual([
      { categoryId: "gasto-restaurantes", cents: 36_500 },
      { categoryId: "gasto-comida", cents: 25_000 },
    ]);
  });
});
