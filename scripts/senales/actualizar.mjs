#!/usr/bin/env node
/**
 * Noticias, calendario económico y avisos de mercado. Corre en GitHub Actions después de
 * bajar los precios y escribe en la carpeta de datos:
 *   noticias.json, calendario.json, senales.json (avisos públicos) y senales-estado.json.
 * Si hay bot de Telegram configurado, manda los avisos según la configuración SENALES_CONFIG.
 *
 * Uso: node --experimental-strip-types scripts/senales/actualizar.mjs <carpeta-datos>
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { combinarEventos, leerBea, leerFechasFred, leerFomc, leerResultados } from "./calendario.mjs";
import { bajarNoticias } from "./noticias.mjs";
import { leerConfig, planearSenales, puedeEnviar } from "./senales.mjs";
import { enviarTelegram } from "./telegram.mjs";

const UA = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";
const carpeta = path.resolve(process.argv[2] ?? "datos");
const ahora = new Date();
const { TELEGRAM_BOT_TOKEN = "", TELEGRAM_CHAT_ID = "", SENALES_CONFIG = "", FRED_API_KEY = "", FINNHUB_API_KEY = "" } = process.env;
const SECRETOS = [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FRED_API_KEY, FINNHUB_API_KEY].filter(Boolean);

function limpio(error) {
  let mensaje = error instanceof Error ? error.message : String(error);
  for (const secreto of SECRETOS) mensaje = mensaje.split(secreto).join("***");
  return mensaje.slice(0, 160);
}

async function leerJson(nombre, inicial) {
  try {
    return JSON.parse(await readFile(path.join(carpeta, nombre), "utf8"));
  } catch {
    return inicial;
  }
}

async function escribirJson(nombre, valor) {
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, nombre), `${JSON.stringify(valor)}\n`);
}

async function obtenerTexto(url) {
  const respuesta = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.text();
}

const isoDia = (fecha) => fecha.toISOString().slice(0, 10);

async function calendario(anterior) {
  const nuevos = [];
  const fuentes = [];
  const intentar = async (nombre, tarea) => {
    try {
      const eventos = await tarea();
      nuevos.push(...eventos);
      fuentes.push({ nombre, estado: "ok", total: eventos.length });
    } catch (error) {
      fuentes.push({ nombre, estado: "error", mensaje: limpio(error) });
    }
  };
  await intentar("Reserva Federal", async () => leerFomc(await obtenerTexto("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm")));
  await intentar("BEA", async () => leerBea(await obtenerTexto("https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics")));
  if (FRED_API_KEY) {
    await intentar("FRED", async () => {
      const desde = isoDia(new Date(ahora.getTime() - 7 * 86_400_000));
      const hasta = isoDia(new Date(ahora.getTime() + 180 * 86_400_000));
      const eventos = [];
      for (const [id, tipo] of [[10, "cpi"], [50, "empleo"]]) {
        const url = `https://api.stlouisfed.org/fred/release/dates?release_id=${id}&realtime_start=${desde}&realtime_end=${hasta}&include_release_dates_with_no_data=true&file_type=json&api_key=${FRED_API_KEY}`;
        eventos.push(...leerFechasFred(JSON.parse(await obtenerTexto(url)), tipo));
      }
      return eventos;
    });
  }
  if (FINNHUB_API_KEY) {
    await intentar("Finnhub", async () => {
      const empresas = [
        ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["AMZN", "Amazon"], ["GOOGL", "Alphabet"],
        ["META", "Meta"], ["TSLA", "Tesla"], ["BRK.B", "Berkshire Hathaway"], ["JPM", "JPMorgan Chase"], ["V", "Visa"], ["KO", "Coca-Cola"],
      ].map(([simbolo, nombre]) => ({ simbolo, nombre }));
      const url = `https://finnhub.io/api/v1/calendar/earnings?from=${isoDia(ahora)}&to=${isoDia(new Date(ahora.getTime() + 60 * 86_400_000))}&token=${FINNHUB_API_KEY}`;
      return leerResultados(JSON.parse(await obtenerTexto(url)), empresas);
    });
  }
  const correctas = new Set(fuentes.filter((fuente) => fuente.estado === "ok").map((fuente) => fuente.nombre));
  return { version: 1, generadoEn: ahora.toISOString(), eventos: combinarEventos(nuevos, anterior.eventos ?? [], correctas, ahora), fuentes };
}

async function main() {
  // 1. Noticias.
  const noticiasAnteriores = await leerJson("noticias.json", { noticias: [] });
  const { noticias, fuentes } = await bajarNoticias(obtenerTexto, noticiasAnteriores.noticias ?? [], ahora);
  const archivoNoticias = { version: 1, generadoEn: ahora.toISOString(), noticias, fuentes };
  await escribirJson("noticias.json", archivoNoticias);
  console.log(`Noticias: ${noticias.length}. Fuentes con error: ${fuentes.filter((fuente) => fuente.estado === "error").map((fuente) => fuente.nombre).join(", ") || "ninguna"}.`);

  // 2. Calendario.
  const archivoCalendario = await calendario(await leerJson("calendario.json", { eventos: [] }));
  await escribirJson("calendario.json", archivoCalendario);
  console.log(`Calendario: ${archivoCalendario.eventos.length} eventos. ${archivoCalendario.fuentes.map((fuente) => `${fuente.nombre}: ${fuente.estado}`).join(", ")}.`);

  // 3. Señales.
  const mercados = await leerJson("mercados.json", { activos: {} });
  const estado = await leerJson("senales-estado.json", { publicadas: {}, telegram: {}, historial: [] });
  const publicas = await leerJson("senales.json", { senales: [] });
  const config = leerConfig(SENALES_CONFIG);
  const contexto = { ahora, mercados, noticias: archivoNoticias, calendario: archivoCalendario, config };

  const nuevasPublicas = planearSenales({ ...contexto, enviados: estado.publicadas ?? {} }).filter((senal) => senal.publica);
  for (const senal of nuevasPublicas) {
    for (const clave of senal.claves ?? [senal.clave]) estado.publicadas[clave] = ahora.toISOString();
  }
  const lista = [
    ...nuevasPublicas.map(({ tipo, prioridad, titulo, texto }) => ({ fecha: ahora.toISOString(), tipo, prioridad, titulo, texto })),
    ...(publicas.senales ?? []),
  ].slice(0, 60);
  await escribirJson("senales.json", { version: 1, generadoEn: ahora.toISOString(), senales: lista });
  console.log(`Señales nuevas: ${nuevasPublicas.length}.`);

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const historial = (estado.historial ?? []).filter((momento) => Date.parse(momento) > ahora.getTime() - 2 * 3_600_000);
    let enviadas = 0;
    for (const senal of planearSenales({ ...contexto, enviados: estado.telegram ?? {} })) {
      if (!puedeEnviar(senal, config, ahora, historial)) continue;
      try {
        await enviarTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, senal.texto);
        for (const clave of senal.claves ?? [senal.clave]) estado.telegram[clave] = ahora.toISOString();
        historial.push(ahora.toISOString());
        enviadas += 1;
      } catch (error) {
        console.log(`Telegram: ${limpio(error)}`);
        break;
      }
    }
    estado.historial = historial;
    console.log(`Telegram: ${enviadas} enviados.`);
  } else {
    console.log("Telegram sin configurar (faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID).");
  }

  // Las claves de más de 40 días ya no hacen falta.
  const limite = ahora.getTime() - 40 * 86_400_000;
  for (const grupo of ["publicadas", "telegram"]) {
    estado[grupo] = Object.fromEntries(Object.entries(estado[grupo] ?? {}).filter(([, momento]) => Date.parse(momento) > limite));
  }
  await escribirJson("senales-estado.json", estado);
}

await main();
