import { obtenerJson, redondear } from "./comun.mjs";

/** Coinbase Exchange: API pública sin clave para precios de cripto. */
export const FUENTE_COINBASE = "Coinbase";

/** Precio actual y precio de hace 24 horas (de /stats y /ticker). */
export function leerCoinbase(ticker, stats) {
  const precio = Number(ticker?.price);
  const apertura = Number(stats?.open);
  if (!Number.isFinite(precio)) throw new Error("Sin precio");
  return {
    precio: redondear(precio),
    cierreAnterior: Number.isFinite(apertura) ? redondear(apertura) : null,
    hora: typeof ticker?.time === "string" ? new Date(ticker.time).toISOString() : new Date().toISOString(),
    moneda: "USD",
    retrasoMin: 0,
  };
}

/** Velas diarias: Coinbase devuelve [t, low, high, open, close, volume], de la más nueva a la más vieja. */
export function leerVelasCoinbase(velas) {
  if (!Array.isArray(velas)) throw new Error("Respuesta sin velas");
  return velas
    .filter((vela) => Array.isArray(vela) && vela.length >= 6)
    .map(([t, l, h, o, c, v]) => [t, redondear(o), redondear(h), redondear(l), redondear(c), Math.round(v)])
    .sort((a, b) => a[0] - b[0]);
}

export async function precioCoinbase(producto) {
  const base = `https://api.exchange.coinbase.com/products/${producto}`;
  const [ticker, stats] = await Promise.all([obtenerJson(`${base}/ticker`), obtenerJson(`${base}/stats`)]);
  return leerCoinbase(ticker, stats);
}

export async function velasDiariasCoinbase(producto) {
  return leerVelasCoinbase(await obtenerJson(`https://api.exchange.coinbase.com/products/${producto}/candles?granularity=86400`));
}
