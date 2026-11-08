import { describe, expect, it } from "vitest";
import { formatChange, formatQuote, quoteChange } from "./format";

describe("formato de precios de mercado", () => {
  it("usa la unidad de cada activo", () => {
    expect(formatQuote(7376.859863, "pts")).toBe("7,376.86");
    expect(formatQuote(612.5, "USD")).toBe("USD 612.50");
    expect(formatQuote(18.23456, "MXN")).toBe("$18.2346");
    expect(formatQuote(4.213, "%")).toBe("4.21%");
  });

  it("muestra el cambio del día con signo y porcentaje", () => {
    // 7,376.86 − 7,356.73 = 20.13; 20.13 ÷ 7,356.73 = 0.2736%
    const change = quoteChange(7376.86, 7356.73);
    expect(change).not.toBeNull();
    if (change) expect(formatChange(change, "pts", 7376.86)).toBe("+20.13 (+0.27%)");
    const down = quoteChange(98, 100);
    if (down) expect(formatChange(down, "USD", 98)).toBe("−2.00 (−2.00%)");
  });

  it("en tasas el cambio va en puntos porcentuales", () => {
    const change = quoteChange(4.26, 4.21);
    if (change) expect(formatChange(change, "%", 4.26)).toBe("+0.05 pp");
  });

  it("sin cierre anterior no hay cambio", () => {
    expect(quoteChange(10, null)).toBeNull();
  });
});
