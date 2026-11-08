import { describe, expect, it } from "vitest";
import { base100, cagr, periodReturns, simpleReturn, valueAtOrBefore, type Point } from "./returns";

const t = (date: string) => Date.parse(`${date}T00:00:00Z`) / 1000;

describe("simpleReturn y cagr", () => {
  it("calcula a mano: de 100 a 121 en 2 años es 21% total y 10% anual", () => {
    expect(simpleReturn(100, 121)).toBeCloseTo(0.21, 12);
    // (121/100)^(1/2) − 1 = 1.1 − 1 = 0.10
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1, 12);
  });

  it("no calcula con valores no positivos", () => {
    expect(cagr(0, 100, 1)).toBeNull();
    expect(simpleReturn(0, 5)).toBeNull();
  });
});

describe("periodReturns", () => {
  // Serie mensual de 2021-11-01 a 2026-11-01 que sube 1% al mes.
  const points: Point[] = Array.from({ length: 61 }, (_, i) => {
    const date = new Date(Date.UTC(2021, 10 + i, 1));
    return [date.getTime() / 1000, 100 * 1.01 ** i];
  });

  it("1 mes: +1%; 1 año: 1.01^12 − 1; 5 años anualizado = 1.01^12 − 1", () => {
    const result = Object.fromEntries(periodReturns(points).map((item) => [item.period, item]));
    expect(result["1M"]?.value).toBeCloseTo(0.01, 10);
    expect(result["1A"]?.value).toBeCloseTo(1.01 ** 12 - 1, 10);
    expect(result["5A"]?.value).toBeCloseTo(1.01 ** 60 - 1, 10);
    // 5 años de calendario son 1,826 días (incluye un 29 de febrero): casi exacto.
    expect(result["5A"]?.annualized).toBeCloseTo(1.01 ** 12 - 1, 3);
    // YTD: desde el cierre del 1 de diciembre de 2025 (último dato del año anterior) → 11 meses.
    expect(result.YTD?.value).toBeCloseTo(1.01 ** 11 - 1, 10);
  });

  it("sin historia suficiente deja el periodo vacío", () => {
    const short = points.slice(-6);
    const result = Object.fromEntries(periodReturns(short).map((item) => [item.period, item]));
    expect(result["1A"]?.value).toBeNull();
    expect(result["3M"]?.value).not.toBeNull();
  });
});

describe("base100 y valueAtOrBefore", () => {
  it("normaliza a 100 en la fecha inicial para comparar activos", () => {
    const points: Point[] = [
      [t("2026-01-01"), 50],
      [t("2026-01-02"), 55],
      [t("2026-01-03"), 60],
    ];
    expect(base100(points, t("2026-01-02"))).toEqual([
      [t("2026-01-02"), 100],
      [t("2026-01-03"), (60 / 55) * 100],
    ]);
    expect(valueAtOrBefore(points, t("2026-01-02") + 3600)).toEqual([t("2026-01-02"), 55]);
  });
});
