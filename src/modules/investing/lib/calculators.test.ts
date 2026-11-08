import { describe, expect, it } from "vitest";
import {
  averageCost,
  cagr,
  feeImpact,
  futureValue,
  inTodaysMoney,
  monthlyRate,
  netOfFees,
  realRate,
  requiredMonthly,
  ruleOf72,
  xirr,
  yearlyProjection,
} from "./calculators";

// Tasa anual que equivale a exactamente 1% mensual: 1.01^12 − 1 = 12.6825…%
const ONE_PERCENT_MONTHLY = 1.01 ** 12 - 1;

describe("1. interés compuesto con aportaciones", () => {
  it("caso a mano: $100 al mes por 2 meses al 1% mensual", () => {
    // Al final de cada mes: el primer depósito crece un mes (101) + el segundo (100) = 201.
    expect(futureValue({ initial: 0, monthly: 100, annualRate: ONE_PERCENT_MONTHLY, months: 2, timing: "fin" })).toBeCloseTo(201, 9);
    // Al inicio: 100 → 101 → 102.01, y 100 → 101: total 203.01.
    expect(futureValue({ initial: 0, monthly: 100, annualRate: ONE_PERCENT_MONTHLY, months: 2, timing: "inicio" })).toBeCloseTo(203.01, 9);
  });

  it("la tasa mensual equivale a la anual: (1 + i)^12 = 1 + anual", () => {
    expect((1 + monthlyRate(0.08)) ** 12).toBeCloseTo(1.08, 12);
    // $10,000 sin aportaciones al 8% anual por 12 meses = $10,800.
    expect(futureValue({ initial: 10_000, monthly: 0, annualRate: 0.08, months: 12, timing: "fin" })).toBeCloseTo(10_800, 8);
  });

  it("con tasa 0 solo suma lo aportado", () => {
    expect(futureValue({ initial: 500, monthly: 100, annualRate: 0, months: 10, timing: "fin" })).toBe(1500);
  });
});

describe("2. escenarios año por año", () => {
  it("separa lo aportado de lo ganado", () => {
    const [first] = yearlyProjection({ initial: 10_000, monthly: 0, annualRate: 0.08, timing: "fin" }, 2);
    expect(first).toEqual({ year: 1, contributed: 10_000, value: expect.closeTo(10_800, 6), earnings: expect.closeTo(800, 6) });
  });
});

describe("3. rendimiento real", () => {
  it("(1.08 ÷ 1.04) − 1 = 3.846%", () => {
    expect(realRate(0.08, 0.04)).toBeCloseTo(0.0384615385, 9);
    // $108,000 dentro de 1 año con 4% de inflación = $103,846.15 de hoy.
    expect(inTodaysMoney(108_000, 0.04, 1)).toBeCloseTo(103_846.1538, 3);
  });
});

describe("4. CAGR", () => {
  it("de 100 a 121 en 2 años es 10% anual", () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1, 12);
    expect(cagr(0, 10, 1)).toBeNull();
  });
});

describe("5. XIRR", () => {
  it("un año exacto de 1,000 a 1,100 es 10%", () => {
    expect(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: 1100 }])).toBeCloseTo(0.1, 8);
  });

  it("coincide con el ejemplo de la documentación de XIRR de Excel (37.34%)", () => {
    const flows = [
      { date: "2008-01-01", amount: -10_000 },
      { date: "2008-03-01", amount: 2_750 },
      { date: "2008-10-30", amount: 4_250 },
      { date: "2009-02-15", amount: 3_250 },
      { date: "2009-04-01", amount: 2_750 },
    ];
    expect(xirr(flows)).toBeCloseTo(0.373362535, 6);
  });

  it("sin flujos de los dos signos no hay tasa", () => {
    expect(xirr([{ date: "2025-01-01", amount: -10 }])).toBeNull();
  });
});

describe("6. regla del 72", () => {
  it("al 8% se duplica en unos 9 años (exacto: 9.006)", () => {
    expect(ruleOf72(0.08)).toEqual({ approx: 9, exact: expect.closeTo(9.00646, 4) });
    expect(ruleOf72(0)).toBeNull();
  });
});

describe("7. costo promedio", () => {
  it("10 títulos a $100 y 20 a $85: $2,700 ÷ 30 = $90", () => {
    expect(averageCost([{ amount: 1000, shares: 10 }, { amount: 1700, shares: 20 }])).toBe(90);
    expect(averageCost([])).toBeNull();
  });
});

describe("8. impacto de comisiones", () => {
  it("7% con 1% de comisión rinde (1.07 × 0.99) − 1 = 5.93%", () => {
    expect(netOfFees(0.07, 0.01)).toBeCloseTo(0.0593, 10);
  });

  it("a más comisión, menos dinero al final", () => {
    const [low, , high] = feeImpact({ initial: 100_000, monthly: 0, timing: "fin" }, 0.07, [0.0003, 0.005, 0.015], [20, 30]);
    expect(low?.values[1]?.value).toBeGreaterThan(high?.values[1]?.value ?? Infinity);
    // 100,000 × 1.07^20 × 0.9997^20 = 386,968.4… × 0.994018… ≈ 384,653.8
    expect(low?.values[0]?.value).toBeCloseTo(100_000 * (1.07 * 0.9997) ** 20, 4);
  });
});

describe("9. aportación necesaria", () => {
  it("para llegar a $201 en 2 meses al 1% mensual hacen falta $100", () => {
    expect(requiredMonthly({ target: 201, initial: 0, annualRate: ONE_PERCENT_MONTHLY, months: 2, timing: "fin" })).toBeCloseTo(100, 9);
    expect(requiredMonthly({ target: 203.01, initial: 0, annualRate: ONE_PERCENT_MONTHLY, months: 2, timing: "inicio" })).toBeCloseTo(100, 9);
  });

  it("si lo que ya tienes alcanza, es cero", () => {
    expect(requiredMonthly({ target: 1000, initial: 2000, annualRate: 0.05, months: 12, timing: "fin" })).toBe(0);
  });
});
