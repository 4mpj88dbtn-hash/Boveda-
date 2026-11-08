import { describe, expect, it } from "vitest";
import { cancunInstant } from "@/lib/dates";
import { makeTrade } from "./test-helpers";
import {
  initialRiskCents,
  lossLimits,
  priceText,
  quantityProblem,
  rMultiple,
  simAccountState,
  suggestSize,
  tradePnlCents,
} from "./trades";

describe("resultado de una operación", () => {
  it("largo: (salida − entrada) × títulos − comisiones", () => {
    // 10 títulos de $200.50 a $210.25: 9.75 × 10 = $97.50, menos $1.00 de comisión = $96.50.
    const trade = makeTrade({ entryPrice: "200.50", quantity: "10", feesCents: 100 });
    expect(tradePnlCents(trade, "210.25")).toBe(9_650);
  });

  it("corto: gana si baja y pierde si sube", () => {
    // Vendes 5 en corto a $100 y recompras a $104: −4 × 5 = −$20.
    const trade = makeTrade({ direction: "corto", entryPrice: "100", stopLoss: "106", quantity: "5" });
    expect(tradePnlCents(trade, "104")).toBe(-2_000);
    expect(tradePnlCents(trade, "97")).toBe(1_500);
  });

  it("fracciones de cripto, redondeado al centavo", () => {
    // 0.05 BTC de $100,000 a $101,234.56: 1,234.56 × 0.05 = $61.728 → $61.73.
    const trade = makeTrade({ entryPrice: "100000", stopLoss: "98000", quantity: "0.05" });
    expect(tradePnlCents(trade, "101234.56")).toBe(6_173);
  });

  it("riesgo inicial y resultado en R", () => {
    // 50 títulos con $2 de distancia al stop arriesgan $100; ganar $200 es 2R.
    const risk = initialRiskCents({ entryPrice: "100", stopLoss: "98", quantity: "50" });
    expect(risk).toBe(10_000);
    expect(rMultiple(20_000, risk)).toBe(2);
    expect(rMultiple(-5_000, risk)).toBe(-0.5);
    expect(rMultiple(100, 0)).toBeNull();
  });

  it("precio publicado como texto exacto", () => {
    expect(priceText(612.35)).toBe("612.35");
    expect(priceText(0.1 + 0.2)).toBe("0.3");
    expect(priceText(100)).toBe("100");
    expect(priceText(1234.5678919)).toBe("1234.567892");
  });
});

describe("cuenta del simulador", () => {
  it("capital, cerradas, dinero comprometido y ganancia abierta", () => {
    const closed = makeTrade({ entryPrice: "200.50", quantity: "10", feesCents: 100, exitPrice: "210.25" });
    const open = makeTrade({ entryPrice: "50", stopLoss: "48", quantity: "10" });
    const real = makeTrade({ account: "real", exitPrice: "150" });
    // $10,000 + $96.50 = $10,096.50; comprometido 10 × $50 = $500; disponible $9,596.50.
    // Abierta: (52 − 50) × 10 = +$20.
    const state = simAccountState(1_000_000, [closed, open, real], { aapl: 52 });
    expect(state).toEqual({
      capitalCents: 1_000_000,
      realizedCents: 9_650,
      equityCents: 1_009_650,
      committedCents: 50_000,
      availableCents: 959_650,
      unrealizedCents: 2_000,
      openCount: 1,
    });
    expect(simAccountState(1_000_000, [open], {}).unrealizedCents).toBeNull();
  });
});

describe("tamaño de posición con la regla de riesgo", () => {
  const base = { equityCents: 1_000_000, availableCents: 1_000_000, riskPercent: 1, decimals: 0 };

  it("limita por riesgo: $10,000 × 1% = $100 entre $2 = 50 títulos", () => {
    expect(suggestSize({ ...base, entry: "50", stop: "48" })).toEqual({ quantity: "50", riskCents: 10_000, maxRiskCents: 10_000, limitedBy: "riesgo" });
  });

  it("limita por efectivo: con stop de $1, el riesgo daría 100 títulos de $500 pero solo alcanzan 20", () => {
    expect(suggestSize({ ...base, entry: "500", stop: "499" })).toEqual({ quantity: "20", riskCents: 2_000, maxRiskCents: 10_000, limitedBy: "efectivo" });
  });

  it("redondea hacia abajo", () => {
    // $10,000 × 1.5% = $150; entre $2.21 = 67.87 → 67 títulos, que arriesgan 67 × 2.21 = $148.07.
    expect(suggestSize({ ...base, riskPercent: 1.5, entry: "33.33", stop: "31.12" })).toMatchObject({ quantity: "67", riskCents: 14_807, maxRiskCents: 15_000 });
  });

  it("cripto con fracciones: $100 entre $2,000 = 0.05 BTC", () => {
    expect(suggestSize({ ...base, decimals: 6, entry: "100000", stop: "98000" })).toEqual({ quantity: "0.05", riskCents: 10_000, maxRiskCents: 10_000, limitedBy: "riesgo" });
  });

  it("sin stop o sin dinero no hay tamaño", () => {
    expect(suggestSize({ ...base, entry: "50", stop: "50" })).toBeNull();
    expect(suggestSize({ ...base, availableCents: 0, entry: "50", stop: "48" })).toBeNull();
  });

  it("revisa los títulos que escribes", () => {
    const limits = { entry: "50", stop: "48", maxRiskCents: 10_000, availableCents: 1_000_000 };
    expect(quantityProblem({ ...limits, quantity: "50" })).toBeNull();
    // 51 × $2 = $102: más que los $100 de tu regla.
    expect(quantityProblem({ ...limits, quantity: "51" })).toBe("riesgo");
    expect(quantityProblem({ ...limits, quantity: "0" })).toBe("vacio");
    expect(quantityProblem({ ...limits, quantity: "abc" })).toBe("vacio");
    // 25 × $500 = $12,500 con $10,000 disponibles.
    expect(quantityProblem({ entry: "500", stop: "499", maxRiskCents: 10_000, availableCents: 1_000_000, quantity: "25" })).toBe("efectivo");
  });
});

describe("límites de pérdida diaria y semanal", () => {
  // Viernes 06/11/2026 a las 15:00 en Cancún; la semana empezó el lunes 02/11.
  const now = cancunInstant("2026-11-06", 15);
  const rules = { dailyLossPercent: 3, weeklyLossPercent: 6 };
  // Largo de 100 títulos a $100: cada $1 de diferencia en la salida son $100.
  const closedOn = (date: string, exitPrice: string, account: "simulador" | "real" = "simulador") =>
    makeTrade({ account, openedAt: cancunInstant(date, 9).getTime(), closedAt: cancunInstant(date, 10).getTime(), exitPrice });

  it("el día se bloquea al perder 3% del capital con que empezó", () => {
    const trades = [closedOn("2026-11-04", "99"), closedOn("2026-11-06", "98"), closedOn("2026-11-06", "99.2")];
    // Empezó el día con $10,000 − $100 = $9,900 → límite 3% = $297. Hoy: −$200 − $80 = −$280.
    const before = lossLimits(1_000_000, trades, rules, now);
    expect(before.day).toEqual({ pnlCents: -28_000, limitCents: 29_700, reached: false });
    expect(before.week).toEqual({ pnlCents: -38_000, limitCents: 60_000, reached: false });
    expect(before.blocked).toBeNull();
    // Otros −$20 llevan el día a −$300: pasa el límite de $297.
    const after = lossLimits(1_000_000, [...trades, closedOn("2026-11-06", "99.8")], rules, now);
    expect(after.day.reached).toBe(true);
    expect(after.blocked).toBe("dia");
  });

  it("la semana se mide desde el capital del lunes", () => {
    const trades = [
      closedOn("2026-10-30", "105"), // semana pasada: +$500 → el lunes empezó con $10,500
      closedOn("2026-11-02", "95.5"), // −$450
      closedOn("2026-11-03", "98.5"), // −$150
      closedOn("2026-11-06", "99.4"), // −$60 (hoy)
      closedOn("2026-11-06", "90", "real"), // las reales no cuentan
      closedOn("2026-11-07", "50"), // mañana: no cuenta
    ];
    // Semana: −$660 contra 6% de $10,500 = $630 → bloqueada. Día: −$60 contra 3% de $9,900 = $297.
    const limits = lossLimits(1_000_000, trades, rules, now);
    expect(limits.week).toEqual({ pnlCents: -66_000, limitCents: 63_000, reached: true });
    expect(limits.day).toEqual({ pnlCents: -6_000, limitCents: 29_700, reached: false });
    expect(limits.blocked).toBe("semana");
  });
});
