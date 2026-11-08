import { nyseStatus } from "../../src/modules/markets/lib/market-hours.ts";
import { idDe } from "./noticias.mjs";

/**
 * Avisos de mercado (señales). Se calculan en GitHub Actions con datos públicos y la
 * configuración de la variable SENALES_CONFIG. Las señales públicas (pre-apertura, cierre,
 * movimientos fuertes, noticias críticas) se publican para la app; las personales (alertas de
 * precio y recordatorio de aportación) solo van por Telegram.
 */

export const CONFIG_INICIAL = {
  preapertura: true,
  cierre: true,
  movimientos: true,
  umbrales: { sp500: 1.5, nasdaq: 1.5, btc: 5, usdmxn: 1 },
  noticias: true,
  alertasPrecio: [],
  aportacionDia: null,
  silencioDesde: 23,
  silencioHasta: 7,
  maxPorHora: 4,
  prioridades: ["critica", "importante", "informativa"],
};

const PRIORIDADES = ["critica", "importante", "informativa"];

/** Lee la configuración (JSON) y la combina con la inicial; ignora lo que venga mal. */
export function leerConfig(texto) {
  let datos = {};
  try {
    datos = texto ? JSON.parse(texto) : {};
  } catch {
    datos = {};
  }
  const config = { ...CONFIG_INICIAL, umbrales: { ...CONFIG_INICIAL.umbrales } };
  for (const clave of ["preapertura", "cierre", "movimientos", "noticias"]) {
    if (typeof datos[clave] === "boolean") config[clave] = datos[clave];
  }
  if (datos.umbrales && typeof datos.umbrales === "object") {
    for (const [id, valor] of Object.entries(datos.umbrales)) {
      if (typeof valor === "number" && valor > 0 && valor < 100) config.umbrales[id] = valor;
    }
  }
  if (Array.isArray(datos.alertasPrecio)) {
    config.alertasPrecio = datos.alertasPrecio
      .filter((alerta) => typeof alerta?.id === "string" && ["mayor", "menor"].includes(alerta.condicion) && Number.isFinite(alerta.valor))
      .slice(0, 30);
  }
  if (Number.isInteger(datos.aportacionDia) && datos.aportacionDia >= 1 && datos.aportacionDia <= 28) config.aportacionDia = datos.aportacionDia;
  for (const clave of ["silencioDesde", "silencioHasta"]) {
    if (Number.isInteger(datos[clave]) && datos[clave] >= 0 && datos[clave] <= 23) config[clave] = datos[clave];
  }
  if (Number.isInteger(datos.maxPorHora) && datos.maxPorHora >= 1 && datos.maxPorHora <= 30) config.maxPorHora = datos.maxPorHora;
  if (Array.isArray(datos.prioridades)) {
    const validas = datos.prioridades.filter((prioridad) => PRIORIDADES.includes(prioridad));
    if (validas.length > 0) config.prioridades = validas;
  }
  return config;
}

const NOMBRES = {
  sp500: "S&P 500",
  nasdaq: "Nasdaq",
  ipc: "IPC",
  btc: "Bitcoin",
  usdmxn: "Dólar/peso",
  dow: "Dow Jones",
  futsp500: "Futuros S&P 500",
  futnasdaq: "Futuros Nasdaq-100",
};

function enCancun(fecha, opciones) {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Cancun", ...opciones }).format(fecha);
}

function diaCancun(fecha) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cancun" }).format(fecha);
}

function cambio(cotizacion) {
  if (!cotizacion || !Number.isFinite(cotizacion.cierreAnterior) || cotizacion.cierreAnterior === 0) return null;
  return ((cotizacion.precio - cotizacion.cierreAnterior) / cotizacion.cierreAnterior) * 100;
}

const porcentaje = (valor) => `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${Math.abs(valor).toFixed(2)}%`;
const numero = (valor, decimales = 2) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor);

function lineaActivo(id, activos) {
  const cotizacion = activos[id];
  if (!cotizacion) return null;
  const variacion = cambio(cotizacion);
  const decimales = id === "usdmxn" ? 4 : 2;
  return `${NOMBRES[id] ?? id}: ${numero(cotizacion.precio, decimales)}${variacion === null ? "" : ` (${porcentaje(variacion)})`}`;
}

/**
 * Señales que tocan en este momento. Cada una tiene una clave única: si ya se generó (está en
 * el estado), no se repite.
 */
export function planearSenales({ ahora, mercados, noticias, calendario, config, enviados }) {
  const senales = [];
  const activos = mercados?.activos ?? {};
  const hoy = diaCancun(ahora);
  const estado = nyseStatus(ahora);
  const minutosParaAbrir = (estado.nextChange.getTime() - ahora.getTime()) / 60_000;
  const agregar = (senal) => {
    if (!enviados[senal.clave]) senales.push(senal);
  };

  // Pre-apertura: día hábil, entre 70 minutos antes de abrir y la apertura.
  if (config.preapertura && estado.state === "preapertura" && minutosParaAbrir <= 70) {
    const lineas = ["futsp500", "futnasdaq", "btc", "usdmxn"].map((id) => lineaActivo(id, activos)).filter(Boolean);
    const eventosHoy = (calendario?.eventos ?? []).filter((evento) => diaCancun(new Date(evento.fecha)) === hoy);
    const clave = (noticias?.noticias ?? [])
      .filter((noticia) => noticia.prioridad !== "informativa" && Date.parse(noticia.fecha ?? 0) > ahora.getTime() - 14 * 3_600_000)
      .slice(0, 3);
    const texto = [
      `☀️ Pre-apertura · abre a las ${enCancun(estado.nextChange, { hour: "2-digit", minute: "2-digit", hour12: false })} (Cancún)`,
      ...lineas.map((linea) => `• ${linea}`),
      eventosHoy.length > 0 ? `Hoy: ${eventosHoy.map((evento) => `${evento.titulo} (${enCancun(new Date(evento.fecha), { hour: "2-digit", minute: "2-digit", hour12: false })})`).join("; ")}` : null,
      clave.length > 0 ? `Noticias: ${clave.map((noticia) => noticia.titulo).join(" · ")}` : null,
    ].filter(Boolean);
    agregar({ clave: `preapertura-${hoy}`, tipo: "preapertura", prioridad: "importante", publica: true, titulo: "Pre-apertura", texto: texto.join("\n") });
  }

  // Cierre: después de las 16:00 de Nueva York de un día hábil.
  const cerroHoy = estado.state === "postcierre" || (estado.state === "cerrado" && estado.reason === null && minutosParaAbrir > 60 * 12);
  if (config.cierre && cerroHoy) {
    const lineas = ["sp500", "nasdaq", "dow", "ipc", "btc", "usdmxn"].map((id) => lineaActivo(id, activos)).filter(Boolean);
    agregar({
      clave: `cierre-${hoy}`,
      tipo: "cierre",
      prioridad: "importante",
      publica: true,
      titulo: "Cierre del mercado",
      texto: ["🔔 Cierre de Wall Street", ...lineas.map((linea) => `• ${linea}`), "Tu portafolio está en la app."].join("\n"),
    });
  }

  // Movimientos fuertes: una vez al día por activo y dirección.
  if (config.movimientos) {
    const fuertes = [];
    for (const [id, umbral] of Object.entries(config.umbrales)) {
      const variacion = cambio(activos[id]);
      if (variacion === null || Math.abs(variacion) < umbral || activos[id]?.estado !== "ok") continue;
      const clave = `movimiento-${id}-${variacion > 0 ? "sube" : "baja"}-${hoy}`;
      if (enviados[clave]) continue;
      fuertes.push({ clave, linea: `${NOMBRES[id] ?? id} ${variacion > 0 ? "sube" : "baja"} ${porcentaje(variacion)} (umbral ${umbral}%)` });
    }
    if (fuertes.length > 0) {
      senales.push({
        clave: fuertes.map((item) => item.clave).join("|"),
        claves: fuertes.map((item) => item.clave),
        tipo: "movimiento",
        prioridad: "critica",
        publica: true,
        titulo: "Movimiento fuerte",
        texto: ["⚡ Movimiento fuerte", ...fuertes.map((item) => `• ${item.linea}`)].join("\n"),
      });
    }
  }

  // Noticias críticas de las últimas 6 horas, agrupadas en un solo aviso.
  if (config.noticias) {
    const nuevas = (noticias?.noticias ?? []).filter(
      (noticia) =>
        noticia.prioridad === "critica" &&
        Date.parse(noticia.fecha ?? 0) > ahora.getTime() - 6 * 3_600_000 &&
        !enviados[`noticia-${noticia.id}`],
    );
    if (nuevas.length > 0) {
      senales.push({
        clave: nuevas.map((noticia) => `noticia-${noticia.id}`).join("|"),
        claves: nuevas.map((noticia) => `noticia-${noticia.id}`),
        tipo: "noticia",
        prioridad: "critica",
        publica: true,
        titulo: "Noticia de alto impacto",
        texto: ["📰 Alto impacto", ...nuevas.slice(0, 3).map((noticia) => `• ${noticia.titulo} (${noticia.fuente})\n${noticia.enlace}`)].join("\n"),
      });
    }
  }

  // Alertas de precio personales (no se publican; la clave va como hash).
  for (const alerta of config.alertasPrecio) {
    const cotizacion = activos[alerta.id];
    if (!cotizacion || cotizacion.estado !== "ok") continue;
    const cumple = alerta.condicion === "mayor" ? cotizacion.precio > alerta.valor : cotizacion.precio < alerta.valor;
    if (!cumple) continue;
    agregar({
      clave: `alerta-${idDe(`${alerta.id}${alerta.condicion}${alerta.valor}`)}-${hoy}`,
      tipo: "alerta",
      prioridad: "importante",
      publica: false,
      titulo: "Alerta de precio",
      texto: `🎯 ${NOMBRES[alerta.id] ?? alerta.id.toUpperCase()} ${alerta.condicion === "mayor" ? "superó" : "bajó de"} ${numero(alerta.valor)}: ahora ${numero(cotizacion.precio)}`,
    });
  }

  // Recordatorio de la aportación mensual al S&P 500, desde las 9:00 de Cancún.
  const horaCancun = Number(enCancun(ahora, { hour: "2-digit", hour12: false }));
  if (config.aportacionDia && Number(hoy.slice(8, 10)) === config.aportacionDia && horaCancun >= 9) {
    agregar({
      clave: `aportacion-${hoy.slice(0, 7)}`,
      tipo: "aportacion",
      prioridad: "importante",
      publica: false,
      titulo: "Aportación mensual",
      texto: "📅 Hoy toca tu aportación mensual al S&P 500. Regístrala en Bóveda → Inversión cuando la hagas.",
    });
  }

  return senales;
}

/** ¿Se puede mandar por Telegram ahora? Horario de silencio, máximo por hora y prioridades. */
export function puedeEnviar(senal, config, ahora, historial) {
  if (!config.prioridades.includes(senal.prioridad)) return false;
  const hora = Number(new Intl.DateTimeFormat("es-MX", { timeZone: "America/Cancun", hour: "2-digit", hour12: false }).format(ahora));
  const { silencioDesde: desde, silencioHasta: hasta } = config;
  const enSilencio = desde === hasta ? false : desde < hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta;
  if (enSilencio) return false;
  const ultimaHora = historial.filter((momento) => Date.parse(momento) > ahora.getTime() - 3_600_000).length;
  return ultimaHora < config.maxPorHora;
}
