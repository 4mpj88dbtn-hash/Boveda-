import { obtenerJson, redondear } from "./comun.mjs";

/** Banxico SIE: FIX y tasa objetivo. Requiere token gratuito (secreto BANXICO_TOKEN). */
export const FUENTE_BANXICO = "Banxico (SIE)";

/** "05/11/2026" → "2026-11-05". */
const fechaIso = (texto) => {
  const [d, m, a] = texto.split("/");
  return `${a}-${m}-${d}`;
};

/** Datos de una serie, sin los días "N/E" (sin dato), de la fecha más vieja a la más nueva. */
export function leerSerieBanxico(json) {
  const datos = json?.bmx?.series?.[0]?.datos;
  if (!Array.isArray(datos)) throw new Error("Respuesta sin datos");
  return datos
    .map((fila) => ({ fecha: fechaIso(String(fila.fecha)), valor: Number(String(fila.dato).replace(/,/g, "")) }))
    .filter((fila) => Number.isFinite(fila.valor))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((fila) => ({ ...fila, valor: redondear(fila.valor) }));
}

export async function serieBanxico(serie, desde, hasta, token) {
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${serie}/datos/${desde}/${hasta}`;
  return leerSerieBanxico(await obtenerJson(url, { "Bmx-Token": token }));
}
