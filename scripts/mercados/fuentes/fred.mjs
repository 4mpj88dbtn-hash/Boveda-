import { obtenerJson, redondear } from "./comun.mjs";

/** FRED (Reserva Federal de St. Louis). Requiere clave gratuita (secreto FRED_API_KEY). */
export const FUENTE_FRED = "FRED (Fed de St. Louis)";

/** Observaciones válidas (FRED marca con "." los días sin dato), de la más vieja a la más nueva. */
export function leerSerieFred(json) {
  const observaciones = json?.observations;
  if (!Array.isArray(observaciones)) throw new Error("Respuesta sin datos");
  return observaciones
    .map((fila) => ({ fecha: String(fila.date), valor: Number(fila.value) }))
    .filter((fila) => fila.valor === fila.valor && Number.isFinite(fila.valor))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((fila) => ({ ...fila, valor: redondear(fila.valor) }));
}

export async function serieFred(serie, desde, clave) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serie}&observation_start=${desde}&file_type=json&api_key=${clave}`;
  return leerSerieFred(await obtenerJson(url));
}
