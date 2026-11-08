#!/usr/bin/env node
/**
 * Sondeo temporal (se borra después): formato de los JSON mensuales del calendario de Banxico.
 */
const UA = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";

async function texto(url, codificacion = "utf-8") {
  const respuesta = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  const cuerpo = new TextDecoder(codificacion).decode(await respuesta.arrayBuffer());
  return { estado: respuesta.status, tipo: respuesta.headers.get("content-type"), cuerpo };
}

const pagina = await texto("https://www.banxico.org.mx/viewers2/JSP/calendarioDifusion_es.jsp", "latin1");
const canal = /gChannelURLString\s*=\s*"([^"]*)"/.exec(pagina.cuerpo)?.[1];
console.log("CANAL>>>", canal);
for (const mes of ["112026", "122026", "012027"]) {
  const url = `https://www.banxico.org.mx/canales/${canal ?? "channels_"}${mes}_es.json`;
  const respuesta = await texto(url);
  console.log(`JSON ${mes} ${respuesta.estado} ${respuesta.tipo} ${respuesta.cuerpo.length}`);
  console.log(`MUESTRA ${mes}>>>`, respuesta.cuerpo.replace(/\s+/g, " ").slice(0, 1500));
  const monetaria = respuesta.cuerpo.replace(/\s+/g, " ").search(/pol[ií]tica monetaria/i);
  if (monetaria >= 0) console.log(`MONETARIA ${mes}>>>`, respuesta.cuerpo.replace(/\s+/g, " ").slice(Math.max(0, monetaria - 400), monetaria + 400));
}
