import Big from "big.js";
import { describe, expect, it } from "vitest";
import {
  convertCents,
  formatMoney,
  formatPercent,
  parseAmountToCents,
  roundHalfUp,
} from "./money";

// Intl separa "USD" del número con un espacio que no se rompe (U+00A0).
const NBSP = " ";

describe("parseAmountToCents", () => {
  it.each([
    ["1,234.56", 123_456],
    ["$1,234.56", 123_456],
    ["$ 1,234.56", 123_456],
    ["1234", 123_400],
    ["1234.5", 123_450],
    ["0.5", 50],
    [".75", 75],
    ["1,000,000", 100_000_000],
    ["  250  ", 25_000],
  ])("convierte %s en %i centavos", (input, cents) => {
    expect(parseAmountToCents(input)).toEqual({ ok: true, cents });
  });

  it.each(["", "  ", ".", "abc", "12.345", "-5", "1,23.45", "12,34", "1.2.3", "$"])(
    "rechaza %j",
    (input) => {
      expect(parseAmountToCents(input).ok).toBe(false);
    },
  );

  it("no pierde centavos donde los decimales binarios sí fallan", () => {
    // En JavaScript, 1.005 * 100 = 100.49999999999999. Aquí no se usa ese camino.
    expect(1.005 * 100).not.toBe(100.5);
    expect(parseAmountToCents("1.01")).toEqual({ ok: true, cents: 101 });
    expect(parseAmountToCents("0.29")).toEqual({ ok: true, cents: 29 });
  });
});

describe("roundHalfUp", () => {
  it("redondea las mitades alejándose de cero", () => {
    expect(roundHalfUp(new Big("2.5"))).toBe(3);
    expect(roundHalfUp(new Big("-2.5"))).toBe(-3);
    expect(roundHalfUp(new Big("2.4999"))).toBe(2);
    expect(roundHalfUp(new Big("55.5"))).toBe(56);
  });
});

describe("convertCents", () => {
  it("convierte dólares a pesos (caso verificado a mano)", () => {
    // US$12.34 × 18.5 MXN por dólar = $228.29 exactos.
    expect(convertCents(1_234, "USD", "MXN", "18.5")).toBe(22_829);
  });

  it("convierte pesos a dólares redondeando al centavo", () => {
    // $100.00 ÷ 18.5 = US$5.405405… → US$5.41
    expect(convertCents(10_000, "MXN", "USD", "18.5")).toBe(541);
  });

  it("redondea las mitades hacia arriba", () => {
    // 3 centavos de dólar × 18.5 = 55.5 centavos de peso → 56
    expect(convertCents(3, "USD", "MXN", "18.5")).toBe(56);
    // 1 centavo de dólar × 18.3456 = 18.3456 centavos → 18
    expect(convertCents(1, "USD", "MXN", "18.3456")).toBe(18);
  });

  it("no cambia nada si la moneda es la misma", () => {
    expect(convertCents(12_345, "MXN", "MXN", "18.5")).toBe(12_345);
  });

  it("rechaza tipos de cambio en cero o negativos y montos no enteros", () => {
    expect(() => convertCents(100, "USD", "MXN", "0")).toThrow(RangeError);
    expect(() => convertCents(100, "USD", "MXN", "-18")).toThrow(RangeError);
    expect(() => convertCents(10.5, "USD", "MXN", "18")).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("usa el formato de México", () => {
    expect(formatMoney(123_456, "MXN")).toBe("$1,234.56");
    expect(formatMoney(123_456, "USD")).toBe(`USD${NBSP}1,234.56`);
    expect(formatMoney(-123_456, "MXN")).toBe("-$1,234.56");
    expect(formatMoney(0, "MXN")).toBe("$0.00");
    expect(formatMoney(5, "MXN")).toBe("$0.05");
  });

  it("muestra el signo en variaciones", () => {
    expect(formatMoney(1_234_567, "MXN", { signDisplay: "exceptZero" })).toBe("+$12,345.67");
    expect(formatMoney(0, "MXN", { signDisplay: "exceptZero" })).toBe("$0.00");
  });

  it("formatea montos grandes sin perder centavos", () => {
    // 90 billones de centavos: aquí un decimal de punto flotante ya mostraría errores.
    expect(formatMoney(9_007_199_254_740_991, "MXN")).toBe("$90,071,992,547,409.91");
  });
});

describe("formatPercent", () => {
  it("muestra el signo y dos decimales", () => {
    expect(formatPercent(0.0125)).toBe("+1.25%");
    expect(formatPercent(-0.0101)).toBe("-1.01%");
    expect(formatPercent(0)).toBe("0.00%");
  });
});
