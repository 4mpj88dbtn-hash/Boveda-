#!/usr/bin/env node
/**
 * Sondeo temporal (se borra después): muestra la estructura de los calendarios oficiales de
 * la Fed y de Banxico para escribir sus lectores.
 */
const UA = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";

async function texto(url, codificacion = "utf-8") {
  const respuesta = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  const bytes = await respuesta.arrayBuffer();
  return new TextDecoder(codificacion).decode(bytes);
}

const fed = await texto("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm");
const inicio = fed.indexOf("2026 FOMC Meetings");
console.log("FED>>>", fed.slice(inicio, inicio + 2500).replace(/\s+/g, " "));
const inicio27 = fed.indexOf("2027 FOMC Meetings");
console.log("FED2027>>>", inicio27, fed.slice(inicio27, inicio27 + 600).replace(/\s+/g, " "));

const banxico = await texto("https://www.banxico.org.mx/viewers2/JSP/calendarioDifusion_es.jsp", "latin1");
const sinEspacios = banxico.replace(/\s+/g, " ");
const i = sinEspacios.search(/pol[ií]tica monetaria/i);
console.log("BANXICO-monetaria>>>", i, sinEspacios.slice(Math.max(0, i - 1200), i + 600));
const tabla = sinEspacios.search(/<table/i);
console.log("BANXICO-tabla>>>", tabla, sinEspacios.slice(tabla, tabla + 1500));

const bea = await texto("https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics");
const eventos = bea.split("BEGIN:VEVENT").slice(1).map((bloque) => bloque.replace(/\r?\n /g, ""));
console.log("BEA eventos:", eventos.length);
for (const evento of eventos.filter((e) => /2026|2027/.test(e)).slice(-12)) {
  console.log("BEA>>>", evento.replace(/\s+/g, " ").slice(0, 220));
}
