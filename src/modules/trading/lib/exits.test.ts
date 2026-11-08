import { describe, expect, it } from "vitest";
import type { Candle } from "@/modules/markets/lib/schema";
import { findExit, mergeBars, type Bar } from "./exits";

const DAY = 86_400;

describe("une las velas sin encimarlas", () => {
  it("usa diarias hasta donde empiezan las de 30 min, y esas hasta donde empiezan las de 5 min", () => {
    const daily: Candle[] = [0, 1, 2, 3].map((d) => [d * DAY, 1, 1, 1, 1, 0]);
    const thirty: Candle[] = Array.from({ length: 48 }, (_, i) => [2 * DAY + i * 1800, 2, 2, 2, 2, 0]);
    const five: Candle[] = Array.from({ length: 10 }, (_, i) => [3 * DAY + i * 300, 3, 3, 3, 3, 0]);
    const bars = mergeBars(daily, thirty, five);
    // Diarias de los días 0 y 1 (terminan antes del día 2), las 48 de 30 min y las 10 de 5 min.
    expect(bars).toHaveLength(60);
    expect(bars[0]?.t).toBe(0);
    expect(bars[2]?.t).toBe(2 * DAY * 1000);
    expect(bars.every((bar, i) => i === 0 || bar.t > (bars[i - 1]?.t ?? 0))).toBe(true);
    // Sin datos de un día, solo quedan las diarias.
    expect(mergeBars(daily, [], [])).toHaveLength(4);
  });
});

describe("cierre por stop u objetivo", () => {
  const openedAt = 1_000_000_000_000;
  const bar = (minutes: number, o: number, h: number, l: number): Bar => ({ t: openedAt + minutes * 60_000, o, h, l, c: o });
  const long = { direction: "largo" as const, stopLoss: "95", target: "110", openedAt };
  const short = { direction: "corto" as const, stopLoss: "104", target: "92", openedAt };

  it("ignora lo que pasó antes de entrar", () => {
    expect(findExit(long, [bar(-5, 100, 120, 80)])).toBeNull();
  });

  it("largo: toca el stop", () => {
    const bars = [bar(0, 100, 103, 97), bar(5, 101, 106, 94)];
    expect(findExit(long, bars)).toEqual({ price: "95", at: openedAt + 300_000, reason: "stop" });
  });

  it("largo: abre por debajo del stop (hueco) y sale a ese precio", () => {
    expect(findExit(long, [bar(5, 93, 96, 92)])).toEqual({ price: "93", at: openedAt + 300_000, reason: "stop" });
  });

  it("largo: llega al objetivo", () => {
    expect(findExit(long, [bar(0, 100, 111, 99)])).toEqual({ price: "110", at: openedAt, reason: "objetivo" });
  });

  it("si una vela toca los dos, se supone el stop", () => {
    expect(findExit(long, [bar(0, 100, 111, 94)])?.reason).toBe("stop");
  });

  it("corto: llega al objetivo abajo", () => {
    const bars = [bar(0, 100, 103, 93), bar(30, 99, 101, 91)];
    expect(findExit(short, bars)).toEqual({ price: "92", at: openedAt + 1_800_000, reason: "objetivo" });
  });

  it("corto: abre por encima del stop", () => {
    expect(findExit(short, [bar(5, 105.25, 106, 104.5)])).toEqual({ price: "105.25", at: openedAt + 300_000, reason: "stop" });
  });

  it("sin objetivo solo cuenta el stop", () => {
    expect(findExit({ ...long, target: null }, [bar(0, 100, 150, 96)])).toBeNull();
  });
});
