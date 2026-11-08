/**
 * Lector mínimo de RSS 2.0 y Atom, sin dependencias. Saca título, enlace, fecha y resumen
 * de cada noticia; quita HTML y decodifica entidades.
 */

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodificar(texto) {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, numero) => String.fromCodePoint(Number(numero)))
    .replace(/&#x([0-9a-f]+);/gi, (_, numero) => String.fromCodePoint(Number.parseInt(numero, 16)))
    .replace(/&([a-z]+);/gi, (coincidencia, nombre) => ENTIDADES[nombre.toLowerCase()] ?? coincidencia);
}

/** Texto plano: sin etiquetas HTML ni espacios de más. */
export function textoPlano(html) {
  return decodificar(decodificar(html))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function etiqueta(bloque, nombre) {
  const coincidencia = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, "i").exec(bloque);
  return coincidencia ? textoPlano(coincidencia[1]) : "";
}

function fechaIso(texto) {
  if (!texto) return null;
  const ms = Date.parse(texto);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Noticias de un feed RSS o Atom: [{ titulo, enlace, fecha, resumen }]. */
export function leerFeed(xml) {
  const noticias = [];
  for (const bloque of xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []) {
    const enlace = etiqueta(bloque, "link") || etiqueta(bloque, "guid");
    noticias.push({
      titulo: etiqueta(bloque, "title"),
      enlace,
      fecha: fechaIso(etiqueta(bloque, "pubDate") || etiqueta(bloque, "dc:date")),
      resumen: etiqueta(bloque, "description").slice(0, 280),
    });
  }
  for (const bloque of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []) {
    const enlace = /<link[^>]*href="([^"]+)"/i.exec(bloque)?.[1] ?? "";
    noticias.push({
      titulo: etiqueta(bloque, "title"),
      enlace: decodificar(enlace),
      fecha: fechaIso(etiqueta(bloque, "published") || etiqueta(bloque, "updated")),
      resumen: (etiqueta(bloque, "summary") || etiqueta(bloque, "content")).slice(0, 280),
    });
  }
  return noticias.filter((noticia) => noticia.titulo && /^https?:\/\//.test(noticia.enlace));
}
