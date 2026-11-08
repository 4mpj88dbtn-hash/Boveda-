import { describe, expect, it } from "vitest";
import { expectancy, formatRatio, maxDrawdown, positionSize, profitFactor, riskAmount, riskReward } from "./calculators";

describe("tamaño de posición", () => {
  it("Títulos = (Capital × % de riesgo) / (Entrada − Stop)", () => {
    // $10,000 × 1% = $100 de riesgo; entre $2 por título (50 − 48) = 50 títulos.
    expect(positionSize(10_000, 1, 50, 48)).toBe(50);
    // En corto el stop va arriba: $10,000 × 2% = $200; entre $2 = 100 títulos.
    expect(positionSize(10_000, 2, 48, 50)).toBe(100);
  });

  it("sin distancia al stop no se puede calcular", () => {
    expect(positionSize(10_000, 1, 50, 50)).toBeNull();
    expect(positionSize(0, 1, 50, 48)).toBeNull();
  });

  it("riesgo máximo por operación", () => {
    // $25,000 × 1.5% = $375.
    expect(riskAmount(25_000, 1.5)).toBe(375);
  });
});

describe("riesgo/beneficio", () => {
  it("(Objetivo − Entrada) / (Entrada − Stop)", () => {
    // Entrada 100, stop 95 (arriesgas 5), objetivo 112 (ganas 12): 12 / 5 = 2.4 → 1:2.4.
    expect(riskReward(100, 95, 112)).toBeCloseTo(2.4, 10);
    expect(formatRatio(2.4)).toBe("1:2.4");
    // En corto: entrada 50, stop 52, objetivo 46 → (46 − 50) / (50 − 52) = 2.
    expect(riskReward(50, 52, 46)).toBe(2);
    expect(formatRatio(2)).toBe("1:2");
  });

  it("el objetivo del lado del stop no es válido", () => {
    expect(riskReward(100, 95, 90)).toBeNull();
    expect(riskReward(100, 100, 110)).toBeNull();
  });
});

describe("esperanza y factor de beneficio", () => {
  it("E = (% aciertos × ganancia promedio) − (% pérdidas × pérdida promedio)", () => {
    // 40% de aciertos con $300 promedio y 60% de pérdidas con $100: 120 − 60 = $60 por operación.
    expect(expectancy(0.4, 300, 100)).toBeCloseTo(60, 10);
    // 50% y 50% con $100 contra $150: 50 − 75 = −$25 (pierdes a la larga).
    expect(expectancy(0.5, 100, 150)).toBeCloseTo(-25, 10);
  });

  it("Ganancias brutas / Pérdidas brutas", () => {
    // $1,500 ganados y $1,000 perdidos → 1.5.
    expect(profitFactor(1_500, 1_000)).toBe(1.5);
    expect(profitFactor(1_000, 0)).toBeNull();
  });
});

describe("drawdown máximo", () => {
  it("(Pico − Valle) / Pico sobre la curva de capital", () => {
    // Pico de 11,000 y luego valle de 8,800: 2,200 / 11,000 = 20%. El 9,900 intermedio solo era 10%.
    const result = maxDrawdown([10_000, 11_000, 9_900, 10_500, 8_800, 12_000]);
    expect(result?.ratio).toBeCloseTo(0.2, 10);
    expect(result).toMatchObject({ amount: 2_200, peakIndex: 1, troughIndex: 4 });
  });

  it("si solo sube, el drawdown es cero", () => {
    expect(maxDrawdown([100, 110, 120])?.ratio).toBe(0);
    expect(maxDrawdown([100])).toBeNull();
  });
});
