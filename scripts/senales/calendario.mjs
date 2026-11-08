/**
 * Calendario económico desde fuentes oficiales:
 *  - Reserva Federal: reuniones del FOMC (página oficial del calendario).
 *  - BEA: PIB e ingreso y gasto personal (PCE), de su calendario público (.ics).
 *  - FRED (con clave): fechas de publicación de inflación (CPI) y empleo (nóminas).
 *  - Finnhub (con clave): reportes de resultados de las empresas grandes.
 * Si una fuente falla, se conservan los eventos que ya se tenían de ella.
 */

const MESES = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (valor) => String(valor).padStart(2, "0");

/**
 * Instante (ISO) de una hora de Nueva York en una fecha. El desfase sale de la base de zonas
 * horarias (Intl), así que respeta el horario de verano.
 */
export function horaNuevaYork(fecha, hora, minuto = 0) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const guess = Date.UTC(anio, mes - 1, dia, hora, minuto);
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" })
    .formatToParts(new Date(guess))
    .find((parte) => parte.type === "timeZoneName")?.value;
  const desfase = Number(/GMT([+-]\d+)/.exec(partes ?? "")?.[1] ?? -5);
  return new Date(guess - desfase * 3_600_000).toISOString();
}

/** Reuniones del FOMC: el anuncio es el último día de la reunión a las 14:00 de Nueva York. */
export function leerFomc(html) {
  const eventos = [];
  const secciones = html.split(/<h4[^>]*>/i).slice(1);
  for (const seccion of secciones) {
    const anio = Number(/(\d{4}) FOMC Meetings/.exec(seccion)?.[1]);
    if (!anio) continue;
    const patron =
      /fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/div>\s*<div class="fomc-meeting__date[^"]*">([^<]+)<\/div>/gi;
    for (const [, mesTexto, diasTexto] of seccion.matchAll(patron)) {
      if (/unscheduled|notation/i.test(diasTexto)) continue;
      const meses = mesTexto.trim().toLowerCase().split("/");
      const mes = MESES[meses.at(-1)?.trim() ?? ""];
      const dias = diasTexto.replace(/\*/g, "").trim().split("-").map((dia) => Number(dia.trim()));
      const dia = dias.at(-1);
      if (!mes || !dia) continue;
      const fecha = `${anio}-${pad(mes)}-${pad(dia)}`;
      const proyecciones = diasTexto.includes("*");
      eventos.push({
        id: `fomc-${fecha}`,
        fecha: horaNuevaYork(fecha, 14),
        titulo: "Decisión de tasas de la Fed (FOMC)",
        detalle: proyecciones ? "Incluye proyecciones económicas y la gráfica de puntos." : "Comunicado y conferencia de prensa.",
        pais: "EE. UU.",
        tipo: "fomc",
        importancia: "alta",
        fuente: "Reserva Federal",
        enlace: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      });
    }
  }
  return eventos;
}

/** Eventos del calendario de BEA: PIB e ingreso y gasto personal (incluye la inflación PCE). */
export function leerBea(ics) {
  const eventos = [];
  for (const bloque of ics.replace(/\r?\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1)) {
    const resumen = /SUMMARY:(.+)/.exec(bloque)?.[1]?.replace(/\\,/g, ",").trim() ?? "";
    const inicio = /DTSTART:(\d{8}T\d{6}Z)/.exec(bloque)?.[1];
    if (!inicio) continue;
    const fecha = `${inicio.slice(0, 4)}-${inicio.slice(4, 6)}-${inicio.slice(6, 8)}T${inicio.slice(9, 11)}:${inicio.slice(11, 13)}:00.000Z`;
    let titulo = null;
    let tipo = null;
    if (/^GDP \((Advance|Second|Third) Estimate\)/i.test(resumen)) {
      const etapa = /Advance/i.test(resumen) ? "primera estimación" : /Second/i.test(resumen) ? "segunda estimación" : "tercera estimación";
      titulo = `PIB de EE. UU. (${etapa})`;
      tipo = "pib";
    } else if (/^Personal Income and Outlays/i.test(resumen)) {
      titulo = "Ingreso y gasto personal de EE. UU. (inflación PCE)";
      tipo = "pce";
    }
    if (!titulo) continue;
    eventos.push({
      id: `bea-${tipo}-${fecha.slice(0, 10)}`,
      fecha,
      titulo,
      detalle: resumen,
      pais: "EE. UU.",
      tipo,
      importancia: tipo === "pib" ? "alta" : "media",
      fuente: "BEA",
      enlace: "https://www.bea.gov/news/schedule",
    });
  }
  return eventos;
}

/** Fechas de publicación de FRED: CPI (release 10) y empleo (release 50), a las 8:30 de Nueva York. */
export function leerFechasFred(json, tipo) {
  const fechas = (json?.release_dates ?? []).map((fila) => String(fila.date));
  const nombres = {
    cpi: ["Inflación de EE. UU. (CPI)", "BLS"],
    empleo: ["Empleo de EE. UU. (nóminas no agrícolas)", "BLS"],
  };
  const [titulo, publica] = nombres[tipo];
  return fechas
    .filter((fecha) => /^\d{4}-\d{2}-\d{2}$/.test(fecha))
    .map((fecha) => ({
      id: `${tipo}-${fecha}`,
      fecha: horaNuevaYork(fecha, 8, 30),
      titulo,
      detalle: `Publica ${publica}. Fecha tomada de FRED.`,
      pais: "EE. UU.",
      tipo,
      importancia: "alta",
      fuente: "FRED",
      enlace: "https://fred.stlouisfed.org/releases/calendar",
    }));
}

/** Resultados trimestrales (Finnhub) de las empresas que sigue la app. */
export function leerResultados(json, empresas) {
  const nombres = new Map(empresas.map((empresa) => [empresa.simbolo, empresa.nombre]));
  return (json?.earningsCalendar ?? [])
    .filter((fila) => nombres.has(fila.symbol) && /^\d{4}-\d{2}-\d{2}$/.test(String(fila.date)))
    .map((fila) => {
      const momento = fila.hour === "bmo" ? "antes de la apertura" : fila.hour === "amc" ? "después del cierre" : "hora por confirmar";
      return {
        id: `resultados-${fila.symbol}-${fila.date}`,
        fecha: horaNuevaYork(fila.date, fila.hour === "amc" ? 16 : 8, fila.hour === "amc" ? 5 : 0),
        titulo: `Resultados de ${nombres.get(fila.symbol)}`,
        detalle: `Reporte trimestral, ${momento}.`,
        pais: "EE. UU.",
        tipo: "resultados",
        importancia: "media",
        fuente: "Finnhub",
        enlace: `https://finance.yahoo.com/quote/${fila.symbol}`,
      };
    });
}

/** Junta eventos nuevos y anteriores por fuente, sin repetir, de hace 7 días a 180 días. */
export function combinarEventos(nuevos, anteriores, fuentesOk, ahora) {
  const desde = ahora.getTime() - 7 * 86_400_000;
  const hasta = ahora.getTime() + 180 * 86_400_000;
  // De las fuentes que fallaron se conservan sus eventos anteriores.
  const conservados = anteriores.filter((evento) => !fuentesOk.has(evento.fuente));
  const porId = new Map();
  for (const evento of [...conservados, ...nuevos]) porId.set(evento.id, evento);
  return [...porId.values()]
    .filter((evento) => {
      const ms = Date.parse(evento.fecha);
      return ms >= desde && ms <= hasta;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
