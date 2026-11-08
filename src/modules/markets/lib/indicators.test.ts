import { describe, expect, it } from "vitest";
import { ema, macd, rsi, sma } from "./indicators";

describe("sma", () => {
  it("promedia los últimos n cierres", () => {
    // (1+2+3)/3 = 2, (2+3+4)/3 = 3, (3+4+5)/3 = 4
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("ema", () => {
  it("arranca con la media simple y luego pondera con k = 2 / (n + 1)", () => {
    // n = 3 → k = 0.5. Inicio: (2+4+6)/3 = 4. Luego 8×0.5 + 4×0.5 = 6; 10×0.5 + 6×0.5 = 8.
    expect(ema([2, 4, 6, 8, 10], 3)).toEqual([null, null, 4, 6, 8]);
  });
});

describe("rsi", () => {
  it("es 100 si solo hubo subidas y 0 si solo hubo bajadas", () => {
    const up = Array.from({ length: 20 }, (_, i) => 100 + i);
    const down = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(rsi(up).at(-1)).toBe(100);
    expect(rsi(down).at(-1)).toBe(0);
  });

  it("calcula un caso a mano con periodo 2", () => {
    // Cierres 10, 11, 10, 12. Cambios +1, −1, +2.
    // Primera media (2 cambios): ganancia 0.5, pérdida 0.5 → RSI 50.
    // Siguiente: ganancia (0.5×1 + 2)/2 = 1.25; pérdida (0.5×1 + 0)/2 = 0.25 → RS 5 → RSI 100 − 100/6 = 83.333…
    const result = rsi([10, 11, 10, 12], 2);
    expect(result[2]).toBe(50);
    expect(result[3]).toBeCloseTo(83.3333333, 6);
  });
});

describe("macd", () => {
  it("es cero si el precio no se mueve y aparece después de la EMA lenta", () => {
    const flat = Array.from({ length: 40 }, () => 50);
    const result = macd(flat);
    expect(result.macd[24]).toBeNull();
    expect(result.macd[25]).toBe(0);
    expect(result.signal[33]).toBe(0);
    expect(result.histogram[33]).toBe(0);
    expect(result.signal[32]).toBeNull();
  });

  it("es positivo en una tendencia de subida", () => {
    const rising = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const result = macd(rising);
    expect(result.macd.at(-1)).toBeGreaterThan(0);
  });
});
