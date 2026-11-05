import { describe, expect, it } from "vitest";
import { centsToKeypad, formatKeypad, keypadToCents, pressKey, type KeypadKey } from "./keypad";

function type(keys: KeypadKey[], start = ""): string {
  return keys.reduce(pressKey, start);
}

describe("pressKey", () => {
  it("escribe dígitos y un solo punto decimal", () => {
    expect(type(["2", "5", "0"])).toBe("250");
    expect(type(["1", ".", "5", "."])).toBe("1.5");
  });

  it("no deja más de 2 decimales", () => {
    expect(type(["9", ".", "9", "9", "9"])).toBe("9.99");
  });

  it("evita ceros a la izquierda y empieza en 0. si el primer toque es el punto", () => {
    expect(type(["0", "0", "7"])).toBe("7");
    expect(type([".", "5"])).toBe("0.5");
    expect(type(["0", ".", "0", "5"])).toBe("0.05");
  });

  it("no pasa de 9 dígitos enteros", () => {
    expect(type(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"])).toBe("123456789");
  });

  it("borra el último toque", () => {
    expect(type(["1", "2", ".", "5", "borrar", "borrar"])).toBe("12");
    expect(pressKey("", "borrar")).toBe("");
  });
});

describe("keypadToCents", () => {
  it("convierte lo escrito a centavos exactos", () => {
    expect(keypadToCents("")).toBe(0);
    expect(keypadToCents("250")).toBe(25000);
    expect(keypadToCents("12.")).toBe(1200);
    expect(keypadToCents("0.1")).toBe(10);
    // 1,234.56 → 123,456 centavos (0.1 + 0.2 en flotante daría error; aquí no hay flotantes).
    expect(keypadToCents("1234.56")).toBe(123456);
    expect(keypadToCents("999999999.99")).toBe(99999999999);
  });
});

describe("centsToKeypad", () => {
  it("prepara un monto guardado para editarlo", () => {
    expect(centsToKeypad(25000)).toBe("250");
    expect(centsToKeypad(25050)).toBe("250.50");
    expect(centsToKeypad(5)).toBe("0.05");
  });
});

describe("formatKeypad", () => {
  it("muestra lo escrito con separador de miles y la moneda", () => {
    expect(formatKeypad("", "MXN")).toBe("$0");
    expect(formatKeypad("1234.5", "MXN")).toBe("$1,234.5");
    expect(formatKeypad("1000000.", "USD")).toBe("USD 1,000,000.");
  });
});
