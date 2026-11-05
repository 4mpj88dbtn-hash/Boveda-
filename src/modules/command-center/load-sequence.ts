/** Clave en sessionStorage: la secuencia de carga del Centro de mando ya se vio. */
export const LOAD_SEQUENCE_KEY = "boveda:secuencia-mando";

/** Atributo en <html> que apaga la secuencia (ver la variante `primera-carga` en globals.css). */
export const LOAD_SEQUENCE_ATTRIBUTE = "data-secuencia-vista";

/**
 * Se ejecuta antes de pintar la página: si la secuencia ya se vio en esta sesión, la apaga
 * para que no parpadee al recargar.
 */
export const LOAD_SEQUENCE_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  LOAD_SEQUENCE_KEY,
)}))document.documentElement.setAttribute(${JSON.stringify(LOAD_SEQUENCE_ATTRIBUTE)},"")}catch(e){}`;
