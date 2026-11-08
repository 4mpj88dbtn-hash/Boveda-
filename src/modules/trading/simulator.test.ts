import { describe, expect, it } from "vitest";
import { cancunInstant } from "@/lib/dates";
import { assetById } from "@/modules/markets/catalog";
import type { Quote } from "@/modules/markets/lib/schema";
import { quantityDecimals, tradability, TRADABLE_ASSETS } from "./simulator";

const quote = (minutesAgo: number, now: Date): Quote => ({
  precio: 100,
  cierreAnterior: 99,
  hora: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  moneda: "USD",
  retrasoMin: null,
  fuente: "Yahoo Finance",
  mini: [],
  estado: "ok",
});

describe("qué se opera en el simulador", () => {
  it("ETFs, acciones de EE. UU. y cripto en dólares; nada en pesos, índices ni futuros", () => {
    const ids = TRADABLE_ASSETS.map((asset) => asset.id);
    expect(ids).toEqual(expect.arrayContaining(["spy", "voo", "aapl", "btc", "sol"]));
    expect(ids).not.toEqual(expect.arrayContaining(["sp500"]));
    for (const id of ["sp500", "walmex", "futsp500", "usdmxn", "oro", "sp500tr"]) expect(ids).not.toContain(id);
  });

  it("acciones en títulos enteros y cripto con fracciones", () => {
    expect(quantityDecimals(assetById("aapl")!)).toBe(0);
    expect(quantityDecimals(assetById("btc")!)).toBe(6);
  });
});

describe("cuándo se puede operar", () => {
  // Viernes 06/11/2026 a las 10:00 en Cancún = 11:00 en Nueva York: bolsa abierta.
  const open = cancunInstant("2026-11-06", 10);
  // Sábado 07/11/2026: bolsa cerrada; cripto sí opera.
  const saturday = cancunInstant("2026-11-07", 10);
  const spy = assetById("spy")!;
  const btc = assetById("btc")!;

  it("acciones y ETFs con la bolsa abierta y un precio reciente", () => {
    expect(tradability(spy, quote(15, open), open)).toEqual({ ok: true, ageMinutes: 15 });
    expect(tradability(spy, quote(50, open), open)).toEqual({ ok: false, reason: "precio-viejo", ageMinutes: 50 });
    expect(tradability(spy, quote(5, saturday), saturday)).toMatchObject({ ok: false, reason: "bolsa-cerrada" });
    expect(tradability(spy, undefined, open)).toEqual({ ok: false, reason: "sin-precio", ageMinutes: null });
  });

  it("cripto a toda hora, con precio de menos de 4 horas", () => {
    expect(tradability(btc, quote(170, saturday), saturday)).toEqual({ ok: true, ageMinutes: 170 });
    expect(tradability(btc, quote(250, saturday), saturday)).toMatchObject({ ok: false, reason: "precio-viejo" });
  });
});
