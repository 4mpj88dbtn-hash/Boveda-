import { describe, expect, it } from "vitest";
import { leerSerieBanxico } from "./banxico.mjs";
import { leerCoinbase, leerVelasCoinbase } from "./coinbase.mjs";
import { limpiarError } from "./comun.mjs";
import { leerSerieFred } from "./fred.mjs";
import { leerGraficaYahoo } from "./yahoo.mjs";

describe("Yahoo Finance", () => {
  const respuesta = {
    chart: {
      result: [
        {
          meta: { regularMarketPrice: 6812.25, chartPreviousClose: 6790.5, regularMarketTime: 1_762_549_200, currency: "USD" },
          timestamp: [100, 200, 300],
          indicators: { quote: [{ open: [1, 2, null], high: [1.5, 2.5, null], low: [0.5, 1.5, null], close: [1.2, 2.2, null], volume: [10, 20, null] }] },
        },
      ],
      error: null,
    },
  };

  it("lee precio, cierre anterior, hora y velas, sin los huecos", () => {
    expect(leerGraficaYahoo(respuesta)).toEqual({
      precio: 6812.25,
      cierreAnterior: 6790.5,
      hora: new Date(1_762_549_200_000).toISOString(),
      moneda: "USD",
      retrasoMin: null,
      velas: [
        [100, 1, 1.5, 0.5, 1.2, 10],
        [200, 2, 2.5, 1.5, 2.2, 20],
      ],
    });
  });

  it("lanza un error si no hay datos", () => {
    expect(() => leerGraficaYahoo({ chart: { result: null, error: { description: "No data found" } } })).toThrow("No data found");
  });
});

describe("Coinbase", () => {
  it("usa el precio de hace 24 horas como referencia", () => {
    expect(leerCoinbase({ price: "101000.50", time: "2026-11-08T12:00:00Z" }, { open: "100000" })).toMatchObject({
      precio: 101000.5,
      cierreAnterior: 100000,
      hora: "2026-11-08T12:00:00.000Z",
    });
  });

  it("ordena las velas de la más vieja a la más nueva y las pasa a [t, o, h, l, c, v]", () => {
    expect(leerVelasCoinbase([[200, 9, 12, 10, 11, 5.4], [100, 8, 11, 9, 10, 3]])).toEqual([
      [100, 9, 11, 8, 10, 3],
      [200, 10, 12, 9, 11, 5],
    ]);
  });
});

describe("Banxico y FRED", () => {
  it("Banxico: convierte fechas dd/mm/aaaa y quita los días sin dato", () => {
    const json = { bmx: { series: [{ datos: [{ fecha: "06/11/2026", dato: "18.2345" }, { fecha: "05/11/2026", dato: "N/E" }, { fecha: "04/11/2026", dato: "18.1" }] }] } };
    expect(leerSerieBanxico(json)).toEqual([
      { fecha: "2026-11-04", valor: 18.1 },
      { fecha: "2026-11-06", valor: 18.2345 },
    ]);
  });

  it("FRED: quita los días marcados con punto", () => {
    const json = { observations: [{ date: "2026-11-05", value: "4.21" }, { date: "2026-11-06", value: "." }] };
    expect(leerSerieFred(json)).toEqual([{ fecha: "2026-11-05", valor: 4.21 }]);
  });

  it("los mensajes de error nunca muestran la clave", () => {
    expect(limpiarError(new Error("GET https://x?api_key=SECRETA falló"), "SECRETA")).toBe("GET https://x?api_key=*** falló");
  });
});
