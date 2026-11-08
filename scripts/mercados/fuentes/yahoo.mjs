import { obtenerJson, redondear } from "./comun.mjs";

/**
 * Yahoo Finance (endpoint de gráficas, sin clave). No es una API oficial: puede cambiar o
 * limitar las consultas. Se usa con pausas entre llamadas.
 */
export const FUENTE_YAHOO = "Yahoo Finance";

/** Convierte la respuesta de /v8/finance/chart en velas [t, o, h, l, c, v] y datos del precio. */
export function leerGraficaYahoo(json) {
  const resultado = json?.chart?.result?.[0];
  if (!resultado) throw new Error(json?.chart?.error?.description ?? "Respuesta sin datos");
  const meta = resultado.meta ?? {};
  const tiempos = resultado.timestamp ?? [];
  const cotizacion = resultado.indicators?.quote?.[0] ?? {};
  const velas = [];
  tiempos.forEach((t, i) => {
    const c = cotizacion.close?.[i];
    if (c === null || c === undefined || !Number.isFinite(c)) return;
    const o = cotizacion.open?.[i] ?? c;
    const h = cotizacion.high?.[i] ?? c;
    const l = cotizacion.low?.[i] ?? c;
    const v = cotizacion.volume?.[i] ?? 0;
    velas.push([t, redondear(o), redondear(h), redondear(l), redondear(c), v ?? 0]);
  });
  const precio = meta.regularMarketPrice;
  if (!Number.isFinite(precio)) throw new Error("Sin precio");
  return {
    precio: redondear(precio),
    cierreAnterior: Number.isFinite(meta.chartPreviousClose) ? redondear(meta.chartPreviousClose) : null,
    hora: Number.isFinite(meta.regularMarketTime) ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    moneda: typeof meta.currency === "string" ? meta.currency : null,
    retrasoMin: Number.isFinite(meta.exchangeDataDelayedBy) ? meta.exchangeDataDelayedBy : null,
    velas,
  };
}

export async function graficaYahoo(simbolo, rango, intervalo) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=${rango}&interval=${intervalo}&includePrePost=false&events=div%2Csplit`;
  return leerGraficaYahoo(await obtenerJson(url));
}
