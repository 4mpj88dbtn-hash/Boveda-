import { describe, expect, it } from "vitest";
import {
  contributedVsValue,
  dividendTotals,
  mergeSeries,
  monthlyStreak,
  portfolioXirr,
  positions,
  purchaseCost,
  simulateMonthlyInvesting,
  type Purchase,
} from "./portfolio";

const buy = (overrides: Partial<Purchase>): Purchase => ({
  id: "p",
  date: "2026-01-15",
  assetId: "voo",
  shares: "2",
  priceUsd: "500",
  fxRate: "18",
  commissionCents: 0,
  commissionCurrency: "MXN",
  note: "",
  createdAt: 0,
  ...overrides,
});

describe("purchaseCost", () => {
  it("títulos × precio + comisión, en USD y MXN", () => {
    // 0.5 títulos × $600 = $300 USD; × 18.50 = $5,550 MXN; comisión $25 MXN = $1.35135… USD.
    const cost = purchaseCost(buy({ shares: "0.5", priceUsd: "600", fxRate: "18.50", commissionCents: 2_500 }));
    expect(cost).toEqual({ usdCents: 30_135, mxnCents: 557_500, commissionMxnCents: 2_500 });
  });
});

describe("positions: separa el efecto del mercado y del tipo de cambio", () => {
  /*
   * Caso a mano. Compras de VOO:
   *   2 títulos a $500 con tipo de cambio 18  → $1,000 USD = $18,000 MXN
   *   1 título  a $560 con tipo de cambio 20  → $560 USD   = $11,200 MXN, comisión $50 MXN
   * Hoy VOO vale $600 y el dólar $19.
   *   Valor: 3 × 600 = $1,800 USD × 19 = $34,200 MXN
   *   Efecto mercado: 2 × (600 − 500) × 18 + 1 × (600 − 560) × 20 = 3,600 + 800 = $4,400
   *   Efecto tipo de cambio: 2 × 600 × (19 − 18) + 1 × 600 × (19 − 20) = 1,200 − 600 = $600
   *   Invertido: 18,000 + 11,200 + 50 = $29,250 → ganancia 34,200 − 29,250 = $4,950 = 4,400 + 600 − 50 ✓
   */
  const purchases = [buy({ id: "a" }), buy({ id: "b", shares: "1", priceUsd: "560", fxRate: "20", commissionCents: 5_000 })];

  it("cuadra el caso a mano", () => {
    const [voo] = positions(purchases, { voo: 600 }, "19");
    expect(voo).toMatchObject({
      shares: "3",
      investedMxnCents: 2_925_000,
      valueUsdCents: 180_000,
      valueMxnCents: 3_420_000,
      marketEffectMxnCents: 440_000,
      fxEffectMxnCents: 60_000,
      commissionsMxnCents: 5_000,
    });
    // Costo promedio con comisión: (1,000 + 560 + 50 ÷ 20) ÷ 3 = 1,562.50 ÷ 3 = 520.8333
    expect(voo?.averageCostUsd).toBeCloseTo(520.8333, 4);
  });

  it("sin precio de hoy no inventa el valor", () => {
    const [voo] = positions(purchases, {}, "19");
    expect(voo).toMatchObject({ valueUsdCents: null, valueMxnCents: null, marketEffectMxnCents: null });
  });
});

describe("dividendos, XIRR y constancia", () => {
  it("suma dividendos en USD y en pesos del día del depósito", () => {
    expect(dividendTotals([{ id: "d", date: "2026-03-30", assetId: "voo", amountUsdCents: 1_234, fxRate: "18", note: "", createdAt: 0 }])).toEqual({
      usdCents: 1_234,
      mxnCents: 22_212,
    });
  });

  it("XIRR de una compra de $18,000 que vale $19,800 un año después es 10%", () => {
    const purchases = [buy({ date: "2025-01-01", shares: "2", priceUsd: "500", fxRate: "18" })];
    expect(portfolioXirr(purchases, [], 1_980_000, "2026-01-01")).toBeCloseTo(0.1, 8);
    expect(portfolioXirr(purchases, [], 1_980_000, "2025-01-15")).toBeNull();
  });

  it("cuenta meses seguidos invirtiendo; el mes en curso no rompe la racha", () => {
    const dates = ["2026-08-03", "2026-09-02", "2026-10-01", "2026-06-01"].map((date) => ({ date }));
    expect(monthlyStreak(dates, "2026-11-08")).toBe(3);
    expect(monthlyStreak([...dates, { date: "2026-11-05" }], "2026-11-08")).toBe(4);
    expect(monthlyStreak([], "2026-11-08")).toBe(0);
  });
});

describe("contributedVsValue", () => {
  it("valor al cierre de cada mes con el cierre del ETF y el tipo de cambio de ese día", () => {
    const t = (date: string) => Date.parse(`${date}T14:30:00Z`) / 1000;
    const closes = { voo: [[t("2026-01-30"), 510], [t("2026-02-27"), 520]] as [number, number][] };
    const fx = [[t("2026-01-30"), 18], [t("2026-02-27"), 18.5]] as [number, number][];
    expect(contributedVsValue([buy({})], closes, fx, ["2026-01", "2026-02"])).toEqual([
      // 2 × 510 × 18 = 18,360; 2 × 520 × 18.5 = 19,240
      { month: "2026-01", contributedMxnCents: 1_800_000, valueMxnCents: 1_836_000 },
      { month: "2026-02", contributedMxnCents: 1_800_000, valueMxnCents: 1_924_000 },
    ]);
  });
});

describe("simulador histórico", () => {
  const t = (date: string) => Date.parse(`${date}T14:30:00Z`) / 1000;
  /*
   * $100 cada mes de enero a marzo con cierres 50, 100 y 100, y último dato 100:
   *   títulos = 2 + 1 + 1 = 4 → valor 400; aportado 300.
   */
  const series: [number, number][] = [
    [t("2025-01-02"), 50],
    [t("2025-02-03"), 100],
    [t("2025-03-03"), 100],
    [t("2025-03-31"), 100],
  ];

  it("compra el primer cierre de cada mes y valora con el último", () => {
    const result = simulateMonthlyInvesting(series, 100, "2025-01");
    expect(result).toMatchObject({ months: 3, contributed: 300, value: 400, shares: 4, firstDate: "2025-01-02", lastDate: "2025-03-31" });
    expect(result?.annualized).toBeGreaterThan(0);
  });

  it("une la serie semanal con la diaria sin repetir fechas", () => {
    expect(mergeSeries([[1, 10], [5, 11], [9, 12]], [[6, 20], [7, 21]])).toEqual([
      [1, 10],
      [5, 11],
      [6, 20],
      [7, 21],
    ]);
  });
});
