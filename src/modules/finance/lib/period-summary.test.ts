import { describe, expect, it } from "vitest";
import { monthRange, weekRange } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "../defaults";
import { latestPublished, publishedAt, summarizePeriod } from "./period-summary";
import { movement } from "./test-data";

describe("cuándo queda listo cada resumen", () => {
  it("el semanal el domingo a las 20:00 de Cancún", () => {
    const week = weekRange("2026-11-05"); // lunes 2 a domingo 8
    expect(publishedAt("semanal", week).toISOString()).toBe("2026-11-09T01:00:00.000Z");
    // Domingo 8 a las 19:59 todavía se ve el de la semana anterior; a las 20:00, el nuevo.
    expect(latestPublished("semanal", new Date("2026-11-09T00:59:00Z"))).toEqual(weekRange("2026-10-26"));
    expect(latestPublished("semanal", new Date("2026-11-09T01:00:00Z"))).toEqual(week);
  });

  it("el mensual el día 1 a las 9:00 de Cancún", () => {
    expect(publishedAt("mensual", monthRange("2026-10-01")).toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(latestPublished("mensual", new Date("2026-11-01T13:59:00Z"))).toEqual(monthRange("2026-09-01"));
    expect(latestPublished("mensual", new Date("2026-11-01T14:00:00Z"))).toEqual(monthRange("2026-10-01"));
  });
});

/*
 * Semana del lunes 2 al domingo 8 de noviembre de 2026, verificada a mano (centavos):
 *   Ingresos 1,000,000. Gastos: lunes 2 → 30,000 (comida) + 20,000 (súper); jueves 5 → 70,000 (súper);
 *   total 120,000. Balance 880,000; tasa de ahorro 0.88.
 *   Semana anterior: gastos 100,000 → variación (120,000 − 100,000) ÷ 100,000 = +20%.
 *   Las 4 semanas anteriores con movimientos: 100,000 (26 oct) y 60,000 (12 oct) → promedio 80,000 → +50%.
 *   Promedio diario: 120,000 ÷ 7 = 17,142.857… → 17,143. Día de mayor gasto: jueves 5 con 70,000.
 */
const transactions = [
  movement({ type: "ingreso", amountCents: 1_000_000, categoryId: "ingreso-honorarios", date: "2026-11-02" }),
  movement({ type: "gasto", amountCents: 30_000, categoryId: "gasto-comida", date: "2026-11-02" }),
  movement({ type: "gasto", amountCents: 20_000, categoryId: "gasto-super", date: "2026-11-02" }),
  movement({ type: "gasto", amountCents: 70_000, categoryId: "gasto-super", date: "2026-11-05" }),
  movement({ type: "gasto", amountCents: 100_000, categoryId: "gasto-comida", date: "2026-10-28" }),
  movement({ type: "gasto", amountCents: 60_000, categoryId: "gasto-comida", date: "2026-10-14" }),
  movement({ type: "gasto", amountCents: 45_000, categoryId: "gasto-comida", date: "2025-11-20" }),
];

describe("summarizePeriod", () => {
  it("arma el resumen semanal con comparaciones, top de categorías y promedio diario", () => {
    const summary = summarizePeriod("semanal", weekRange("2026-11-05"), transactions, DEFAULT_CATEGORIES, "2026-11-10");
    expect(summary.totals).toMatchObject({ incomeCents: 1_000_000, expenseCents: 120_000, balanceCents: 880_000 });
    expect(summary.totals.savingsRate).toBeCloseTo(0.88, 10);
    expect(summary.expenseChange).toBeCloseTo(0.2, 10);
    expect(summary.averageExpenseCents).toBe(80_000);
    expect(summary.expenseVsAverage).toBeCloseTo(0.5, 10);
    expect(summary.topCategories).toEqual([
      { categoryId: "gasto-super", cents: 90_000, share: 0.75 },
      { categoryId: "gasto-comida", cents: 30_000, share: 0.25 },
    ]);
    expect(summary.days).toBe(7);
    expect(summary.dailyAverageCents).toBe(17_143);
    expect(summary.maxDay).toEqual({ date: "2026-11-05", cents: 70_000 });
    expect(summary.lastYear).toBeNull();
  });

  it("si la semana va en curso, el promedio diario cuenta solo los días que han pasado", () => {
    // Jueves 5: 4 días (lunes a jueves) → 120,000 ÷ 4 = 30,000.
    const summary = summarizePeriod("semanal", weekRange("2026-11-05"), transactions, DEFAULT_CATEGORIES, "2026-11-05");
    expect(summary.days).toBe(4);
    expect(summary.dailyAverageCents).toBe(30_000);
  });

  it("el mensual compara con el mismo mes del año anterior cuando hay datos", () => {
    // Noviembre 2026: gastos 120,000; noviembre 2025: 45,000 → (120,000 − 45,000) ÷ 45,000 = +166.67%.
    const summary = summarizePeriod("mensual", monthRange("2026-11-01"), transactions, DEFAULT_CATEGORIES, "2026-12-02");
    expect(summary.lastYear).toMatchObject({ expenseCents: 45_000 });
    expect(summary.expenseVsLastYear).toBeCloseTo(75_000 / 45_000, 10);
    expect(summary.days).toBe(30);
    expect(summary.dailyAverageCents).toBe(4_000);
  });
});
