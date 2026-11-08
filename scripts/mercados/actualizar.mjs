#!/usr/bin/env node
/**
 * Baja precios y series de mercado y los guarda en la carpeta indicada (la carpeta "datos"
 * que se publica junto a la app). Lo corre GitHub Actions; las claves vienen de sus secretos.
 *
 * Reglas: nunca se inventa un dato. Si una fuente falla, se conserva el último dato publicado
 * con su hora original y se marca como "anterior".
 *
 * Uso: node scripts/mercados/actualizar.mjs <carpeta-datos>
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import catalogo from "../../src/modules/markets/catalogo.json" with { type: "json" };
import { FUENTE_BANXICO, serieBanxico } from "./fuentes/banxico.mjs";
import { FUENTE_COINBASE, precioCoinbase, velasDiariasCoinbase } from "./fuentes/coinbase.mjs";
import { limpiarError, pausa } from "./fuentes/comun.mjs";
import { FUENTE_FRED, serieFred } from "./fuentes/fred.mjs";
import { FUENTE_YAHOO, graficaYahoo } from "./fuentes/yahoo.mjs";

const carpeta = path.resolve(process.argv[2] ?? "datos");
const BANXICO_TOKEN = process.env.BANXICO_TOKEN ?? "";
const FRED_API_KEY = process.env.FRED_API_KEY ?? "";
const ahora = new Date();
const PAUSA_MS = 350;
/** Las series diarias se renuevan una vez cada 20 horas. */
const VIGENCIA_SERIES_MS = 20 * 60 * 60 * 1000;

const isoDia = (fecha) => fecha.toISOString().slice(0, 10);
const haceDias = (dias) => isoDia(new Date(ahora.getTime() - dias * 86_400_000));

async function leerJson(archivo) {
  try {
    return JSON.parse(await readFile(archivo, "utf8"));
  } catch {
    return null;
  }
}

async function escribirJson(archivo, valor) {
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, `${JSON.stringify(valor)}\n`);
}

/** Toma ~40 puntos para la mini gráfica de la tarjeta. */
function mini(velas) {
  if (velas.length <= 40) return velas.map((vela) => vela[4]);
  const paso = (velas.length - 1) / 39;
  return Array.from({ length: 40 }, (_, i) => velas[Math.round(i * paso)][4]);
}

/** Último y penúltimo valor de una serie de Banxico o FRED, como cotización. */
function cotizacionDeSerie(serie, fuente) {
  const ultimo = serie.at(-1);
  const anterior = serie.at(-2);
  if (!ultimo) throw new Error("Serie vacía");
  return {
    precio: ultimo.valor,
    cierreAnterior: anterior?.valor ?? null,
    // Dato del día (publicación diaria): se fecha al mediodía de Ciudad de México.
    hora: `${ultimo.fecha}T18:00:00.000Z`,
    moneda: null,
    retrasoMin: null,
    fuente,
    mini: serie.slice(-40).map((fila) => fila.valor),
    fechaDato: ultimo.fecha,
  };
}

async function cotizar(activo) {
  const intentos = [];
  if (activo.yahoo) {
    intentos.push(async () => {
      const grafica = await graficaYahoo(activo.yahoo, "1d", "5m");
      return { ...grafica, fuente: FUENTE_YAHOO, mini: mini(grafica.velas), intradia: grafica.velas };
    });
  }
  if (activo.coinbase) {
    intentos.push(async () => ({ ...(await precioCoinbase(activo.coinbase)), fuente: FUENTE_COINBASE, mini: [] }));
  }
  if (activo.banxico && BANXICO_TOKEN) {
    intentos.push(async () =>
      cotizacionDeSerie(await serieBanxico(activo.banxico, haceDias(60), isoDia(ahora), BANXICO_TOKEN), FUENTE_BANXICO),
    );
  }
  if (activo.fred && FRED_API_KEY) {
    intentos.push(async () => cotizacionDeSerie(await serieFred(activo.fred, haceDias(60), FRED_API_KEY), FUENTE_FRED));
  }
  if (intentos.length === 0) {
    const falta = activo.banxico ? "BANXICO_TOKEN" : activo.fred ? "FRED_API_KEY" : "fuente";
    throw new Error(`Falta configurar ${falta}`);
  }
  const errores = [];
  for (const intento of intentos) {
    try {
      return await intento();
    } catch (error) {
      errores.push(limpiarError(error, BANXICO_TOKEN, FRED_API_KEY));
    } finally {
      await pausa(PAUSA_MS);
    }
  }
  throw new Error(errores.join(" | "));
}

/** Series largas: diaria de 5 años y semanal desde el inicio (para 5A y Máx). */
async function series(activo) {
  if (activo.yahoo) {
    try {
      const diario = (await graficaYahoo(activo.yahoo, "5y", "1d")).velas;
      await pausa(PAUSA_MS);
      const semanal = (await graficaYahoo(activo.yahoo, "max", "1wk")).velas;
      await pausa(PAUSA_MS);
      return { fuente: FUENTE_YAHOO, diario, semanal };
    } catch (error) {
      if (!activo.coinbase) throw error;
    }
  }
  if (activo.coinbase) {
    return { fuente: FUENTE_COINBASE, diario: await velasDiariasCoinbase(activo.coinbase), semanal: [] };
  }
  const desde = haceDias(5 * 366);
  if (activo.banxico && BANXICO_TOKEN) {
    const serie = await serieBanxico(activo.banxico, desde, isoDia(ahora), BANXICO_TOKEN);
    return { fuente: FUENTE_BANXICO, diario: aVelas(serie), semanal: [] };
  }
  if (activo.fred && FRED_API_KEY) {
    const serie = await serieFred(activo.fred, desde, FRED_API_KEY);
    return { fuente: FUENTE_FRED, diario: aVelas(serie), semanal: [] };
  }
  throw new Error("Sin fuente configurada");
}

/** Una serie de valores diarios como velas planas [t, v, v, v, v, 0]. */
function aVelas(serie) {
  return serie.map(({ fecha, valor }) => [Date.parse(`${fecha}T00:00:00Z`) / 1000, valor, valor, valor, valor, 0]);
}

async function main() {
  const anterior = (await leerJson(path.join(carpeta, "mercados.json"))) ?? { activos: {} };
  const activos = {};
  const errores = [];
  const todos = [...catalogo.fijos, ...catalogo.extra];

  for (const activo of todos) {
    // Cotización (cada corrida).
    if (!activo.soloHistoria) {
      try {
        const resultado = await cotizar(activo);
        const intradia = resultado.intradia;
        activos[activo.id] = {
          precio: resultado.precio,
          cierreAnterior: resultado.cierreAnterior,
          hora: resultado.hora,
          moneda: resultado.moneda,
          retrasoMin: resultado.retrasoMin,
          fuente: resultado.fuente,
          mini: resultado.mini,
          ...(resultado.fechaDato ? { fechaDato: resultado.fechaDato } : {}),
          estado: "ok",
        };
        if (intradia?.length) {
          const archivo = path.join(carpeta, "intradia", `${activo.id}.json`);
          const previo = (await leerJson(archivo)) ?? {};
          let cincoDias = previo.cincoDias ?? [];
          if (activo.yahoo && activos[activo.id].fuente === FUENTE_YAHOO) {
            try {
              cincoDias = (await graficaYahoo(activo.yahoo, "5d", "30m")).velas;
            } catch {
              // Se queda la de la corrida anterior.
            }
            await pausa(PAUSA_MS);
          }
          await escribirJson(archivo, { id: activo.id, actualizado: ahora.toISOString(), unDia: intradia, cincoDias });
        }
      } catch (error) {
        const mensaje = limpiarError(error, BANXICO_TOKEN, FRED_API_KEY);
        errores.push({ id: activo.id, mensaje });
        const previo = anterior.activos?.[activo.id];
        if (previo) activos[activo.id] = { ...previo, estado: "anterior" };
      }
    }

    // Series largas (una vez al día).
    const archivoSerie = path.join(carpeta, "series", `${activo.id}.json`);
    const serieAnterior = await leerJson(archivoSerie);
    const vigente = serieAnterior && ahora.getTime() - Date.parse(serieAnterior.actualizado) < VIGENCIA_SERIES_MS;
    if (!vigente) {
      try {
        const nueva = await series(activo);
        await escribirJson(archivoSerie, { id: activo.id, actualizado: ahora.toISOString(), ...nueva });
      } catch (error) {
        errores.push({ id: activo.id, mensaje: `Serie: ${limpiarError(error, BANXICO_TOKEN, FRED_API_KEY)}` });
      }
    }
  }

  await escribirJson(path.join(carpeta, "mercados.json"), {
    version: 1,
    generadoEn: ahora.toISOString(),
    activos,
    errores,
  });

  const correctos = Object.values(activos).filter((activo) => activo.estado === "ok").length;
  console.log(`Precios al día: ${correctos}. Con dato anterior o sin dato: ${errores.length}.`);
  for (const error of errores) console.log(`  · ${error.id}: ${error.mensaje}`);
}

await main();
