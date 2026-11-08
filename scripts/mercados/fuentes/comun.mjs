/** Utilidades comunes para bajar datos de mercado (solo en GitHub Actions). */

export const USER_AGENT = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";

export const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET con tiempo límite; lanza un error claro si la respuesta no es 200. */
export async function obtenerJson(url, encabezados = {}) {
  const respuesta = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...encabezados },
    signal: AbortSignal.timeout(20_000),
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json();
}

/** Redondea a 6 decimales para no guardar ruido de punto flotante. */
export const redondear = (valor) => Math.round(valor * 1e6) / 1e6;

/** Quita la clave de un mensaje de error antes de guardarlo o mostrarlo. */
export function limpiarError(error, ...secretos) {
  let mensaje = error instanceof Error ? error.message : String(error);
  for (const secreto of secretos) if (secreto) mensaje = mensaje.split(secreto).join("***");
  return mensaje.slice(0, 200);
}
