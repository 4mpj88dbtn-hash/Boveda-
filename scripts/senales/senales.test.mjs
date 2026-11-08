import { describe, expect, it } from "vitest";
import { CONFIG_INICIAL, leerConfig, planearSenales, puedeEnviar } from "./senales.mjs";

const cotizacion = (precio, cierreAnterior) => ({ precio, cierreAnterior, estado: "ok" });

describe("leerConfig", () => {
  it("combina con lo inicial e ignora valores inválidos", () => {
    const config = leerConfig(JSON.stringify({ cierre: false, umbrales: { btc: 3, sp500: -1 }, maxPorHora: 99, alertasPrecio: [{ id: "voo", condicion: "menor", valor: 450 }, { id: "x" }] }));
    expect(config.cierre).toBe(false);
    expect(config.umbrales).toEqual({ ...CONFIG_INICIAL.umbrales, btc: 3 });
    expect(config.maxPorHora).toBe(4);
    expect(config.alertasPrecio).toEqual([{ id: "voo", condicion: "menor", valor: 450 }]);
    expect(leerConfig("no es json")).toEqual(CONFIG_INICIAL);
  });
});

describe("planearSenales", () => {
  const base = { noticias: { noticias: [] }, calendario: { eventos: [] }, config: CONFIG_INICIAL, enviados: {} };

  it("pre-apertura: lunes 9 de noviembre de 2026 a las 13:40 UTC (50 min antes de abrir)", () => {
    const mercados = { activos: { futsp500: cotizacion(7400, 7380), btc: cotizacion(101000, 100000), usdmxn: cotizacion(18.2, 18.3) } };
    const senales = planearSenales({ ...base, ahora: new Date("2026-11-09T13:40:00Z"), mercados });
    expect(senales.map((senal) => senal.clave)).toEqual(["preapertura-2026-11-09"]);
    expect(senales[0]?.texto).toContain("abre a las 09:30 (Cancún)");
    expect(senales[0]?.texto).toContain("Futuros S&P 500: 7,400.00 (+0.27%)");
  });

  it("cierre y movimiento fuerte después de las 16:00 de Nueva York", () => {
    // S&P 500 −1.60% (umbral 1.5%) y Bitcoin +2% (umbral 5%, no avisa).
    const mercados = { activos: { sp500: cotizacion(6889.6, 7001.63), btc: cotizacion(102000, 100000) } };
    const senales = planearSenales({ ...base, ahora: new Date("2026-11-09T21:30:00Z"), mercados });
    expect(senales.map((senal) => senal.tipo)).toEqual(["cierre", "movimiento"]);
    expect(senales[1]?.texto).toContain("S&P 500 baja −1.60% (umbral 1.5%)");
    expect(senales[1]?.claves).toEqual(["movimiento-sp500-baja-2026-11-09"]);
  });

  it("no repite lo que ya se avisó", () => {
    const mercados = { activos: { sp500: cotizacion(6889.6, 7001.63) } };
    const enviados = { "cierre-2026-11-09": "x", "movimiento-sp500-baja-2026-11-09": "x" };
    expect(planearSenales({ ...base, enviados, ahora: new Date("2026-11-09T21:30:00Z"), mercados })).toEqual([]);
  });

  it("alerta de precio personal: no se publica y su clave no muestra el umbral", () => {
    const config = { ...CONFIG_INICIAL, cierre: false, alertasPrecio: [{ id: "voo", condicion: "menor", valor: 450 }] };
    const mercados = { activos: { voo: cotizacion(449, 452) } };
    const [senal] = planearSenales({ ...base, config, ahora: new Date("2026-11-08T18:00:00Z"), mercados });
    expect(senal).toMatchObject({ tipo: "alerta", publica: false });
    expect(senal?.clave).not.toContain("450");
  });

  it("noticias críticas recientes en un solo aviso", () => {
    const noticias = {
      noticias: [
        { id: "a", titulo: "Federal Reserve issues FOMC statement", fuente: "Reserva Federal", enlace: "https://fed.gov/a", fecha: "2026-11-08T17:00:00Z", prioridad: "critica" },
        { id: "b", titulo: "Apple sube", fuente: "CNBC", enlace: "https://cnbc.com/b", fecha: "2026-11-08T17:00:00Z", prioridad: "informativa" },
      ],
    };
    const senales = planearSenales({ ...base, noticias, ahora: new Date("2026-11-08T18:00:00Z"), mercados: { activos: {} } });
    expect(senales.map((senal) => senal.claves)).toEqual([["noticia-a"]]);
  });
});

describe("puedeEnviar", () => {
  const senal = { prioridad: "importante" };
  it("respeta el horario de silencio (23:00 a 7:00 de Cancún)", () => {
    // 05:00 UTC = 00:00 en Cancún → silencio; 15:00 UTC = 10:00 → se envía.
    expect(puedeEnviar(senal, CONFIG_INICIAL, new Date("2026-11-08T05:00:00Z"), [])).toBe(false);
    expect(puedeEnviar(senal, CONFIG_INICIAL, new Date("2026-11-08T15:00:00Z"), [])).toBe(true);
  });

  it("respeta el máximo por hora y las prioridades elegidas", () => {
    const ahora = new Date("2026-11-08T15:00:00Z");
    const historial = Array.from({ length: 4 }, () => "2026-11-08T14:30:00Z");
    expect(puedeEnviar(senal, CONFIG_INICIAL, ahora, historial)).toBe(false);
    expect(puedeEnviar({ prioridad: "informativa" }, { ...CONFIG_INICIAL, prioridades: ["critica"] }, ahora, [])).toBe(false);
  });
});
