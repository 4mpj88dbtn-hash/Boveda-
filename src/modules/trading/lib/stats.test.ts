import { describe, expect, it } from "vitest";
import { cancunInstant } from "@/lib/dates";
import { journalStats } from "./stats";
import { makeTrade } from "./test-helpers";

/**
 * Seis operaciones de 100 títulos a $100 con stop en $98 (cada una arriesga $200), cerradas en
 * este orden: +$200, −$100, −$100, +$300, $0, −$50.
 */
const opened = [
  ["2026-11-02", 10],
  ["2026-11-02", 11],
  ["2026-11-03", 10],
  ["2026-11-04", 9],
  ["2026-11-05", 14],
  ["2026-11-06", 15],
] as const;
const exits = ["102", "99", "99", "103", "100", "99.5"];
const trades = exits.map((exitPrice, index) => {
  const [date, hour] = opened[index] ?? ["2026-11-02", 10];
  const openedAt = cancunInstant(date, hour).getTime();
  return makeTrade({
    id: `t${index}`,
    openedAt,
    closedAt: openedAt + 1_800_000,
    exitPrice,
    strategy: index < 3 ? "Ruptura" : "Rebote",
    emotion: index === 1 || index === 2 ? "fomo" : "calma",
    followedPlan: !(index === 1 || index === 2),
  });
});

describe("estadísticas del diario", () => {
  const stats = journalStats([...trades, makeTrade({ id: "abierta" })], 1_000_000);

  it("aciertos, promedios, esperanza y factor de beneficio", () => {
    // 2 ganadoras ($500), 3 perdedoras ($250) y 1 en cero; la abierta no cuenta.
    expect(stats).toMatchObject({ count: 6, wins: 2, losses: 3, breakeven: 1, grossProfitCents: 50_000, grossLossCents: 25_000, netCents: 25_000 });
    expect(stats.winRate).toBeCloseTo(2 / 6, 10);
    expect(stats.averageWinCents).toBe(25_000);
    expect(stats.averageLossCents).toBeCloseTo(25_000 / 3, 10);
    // Ganancia promedio $250 contra pérdida promedio $83.33: 3 a 1.
    expect(stats.payoff).toBeCloseTo(3, 10);
    // E = (2/6 × $250) − (3/6 × $83.33) = $83.33 − $41.67 = $41.67 (= $250 netos / 6).
    expect(stats.expectancyCents).toBeCloseTo(25_000 / 6, 8);
    expect(stats.profitFactor).toBe(2);
    // R: 1, −0.5, −0.5, 1.5, 0 y −0.25 → promedio 1.25 / 6.
    expect(stats.averageR).toBeCloseTo(1.25 / 6, 10);
  });

  it("rachas", () => {
    // G P P G 0 P: la racha perdedora más larga es 2; el cero corta la racha; la actual es 1 perdedora.
    expect(stats.longestWinStreak).toBe(1);
    expect(stats.longestLossStreak).toBe(2);
    expect(stats.currentStreak).toEqual({ kind: "perdedora", length: 1 });
  });

  it("curva de capital y drawdown máximo", () => {
    expect(stats.equity.map((point) => point.cents)).toEqual([1_000_000, 1_020_000, 1_010_000, 1_000_000, 1_030_000, 1_030_000, 1_025_000]);
    // De $10,200 a $10,000: $200 / $10,200 = 1.96%.
    expect(stats.drawdown?.amountCents).toBe(20_000);
    expect(stats.drawdown?.ratio).toBeCloseTo(20_000 / 1_020_000, 10);
    // Sin capital inicial, el drawdown solo se da en dinero.
    expect(journalStats(trades, null).drawdown).toEqual({ ratio: null, amountCents: 20_000 });
  });

  it("por estrategia, día, hora, emoción y plan", () => {
    expect(stats.byStrategy.map(({ key, count, wins, netCents }) => ({ key, count, wins, netCents }))).toEqual([
      { key: "Rebote", count: 3, wins: 1, netCents: 25_000 },
      { key: "Ruptura", count: 3, wins: 1, netCents: 0 },
    ]);
    expect(stats.byWeekday.map((item) => [item.label, item.count, item.netCents])).toEqual([
      ["Lunes", 2, 10_000],
      ["Martes", 1, -10_000],
      ["Miércoles", 1, 30_000],
      ["Jueves", 1, 0],
      ["Viernes", 1, -5_000],
    ]);
    expect(stats.byHour.find((item) => item.key === "10")).toMatchObject({ label: "10:00 a 10:59", count: 2, netCents: 10_000 });
    expect(stats.byEmotion.find((item) => item.key === "fomo")).toMatchObject({ label: "FOMO", count: 2, wins: 0, netCents: -20_000 });
    expect(stats.byPlan.map((item) => [item.label, item.netCents])).toEqual([
      ["Seguí mi plan", 45_000],
      ["No seguí mi plan", -20_000],
    ]);
  });

  it("sin operaciones cerradas", () => {
    const empty = journalStats([], 1_000_000);
    expect(empty).toMatchObject({ count: 0, winRate: null, expectancyCents: null, profitFactor: null, drawdown: null });
    expect(empty.equity).toEqual([{ at: null, cents: 1_000_000 }]);
  });
});
