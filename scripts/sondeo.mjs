#!/usr/bin/env node
/**
 * Sondeo temporal (se borra después): busca de dónde toma sus datos el calendario de Banxico.
 */
const UA = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";

const respuesta = await fetch("https://www.banxico.org.mx/viewers2/JSP/calendarioDifusion_es.jsp", {
  headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(20_000),
});
const html = new TextDecoder("latin1").decode(await respuesta.arrayBuffer()).replace(/\s+/g, " ");
const patrones = [/url\s*[:=]/gi, /\.json/gi, /ajax/gi, /getJSON/gi, /fetch\(/gi, /\.do\b/gi, /servlet/gi, /service/gi, /src="[^"]+\.js"/gi];
const vistos = new Set();
for (const patron of patrones) {
  for (const coincidencia of html.matchAll(patron)) {
    const inicio = Math.max(0, (coincidencia.index ?? 0) - 160);
    const fragmento = html.slice(inicio, inicio + 360);
    const clave = fragmento.slice(100, 220);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    console.log(`BANXICO[${patron.source}]>>> ${fragmento}`);
  }
}
