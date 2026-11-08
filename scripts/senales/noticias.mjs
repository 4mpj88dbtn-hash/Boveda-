import { leerFeed } from "./rss.mjs";

/**
 * Noticias financieras de fuentes públicas (RSS). Cada noticia guarda titular, fuente, hora,
 * enlace al original, temas, activos relacionados y prioridad. Las repetidas se agrupan.
 * Fuentes verificadas desde GitHub Actions el 08/11/2026 (las que bloquean bots no se usan).
 */

export const FEEDS = [
  { id: "fed", nombre: "Reserva Federal", url: "https://www.federalreserve.gov/feeds/press_monetary.xml", temas: ["fed"], oficial: true },
  {
    id: "yahoo",
    nombre: "Yahoo Finance",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,%5EDJI,BTC-USD,VOO,QQQ&region=US&lang=en-US",
    temas: ["mercados"],
  },
  { id: "cnbc", nombre: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", temas: ["mercados"] },
  { id: "cnbc-economia", nombre: "CNBC", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", temas: ["economia-eeuu"] },
  { id: "marketwatch", nombre: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", temas: ["mercados"] },
  { id: "economista", nombre: "El Economista", url: "https://www.eleconomista.com.mx/rss/ultimas-noticias", temas: ["mexico"], soloEconomia: true },
  {
    id: "financiero",
    nombre: "El Financiero",
    url: "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml",
    temas: ["mexico"],
    soloEconomia: true,
  },
  { id: "expansion", nombre: "Expansión", url: "https://expansion.mx/rss/economia", temas: ["mexico"] },
  { id: "coindesk", nombre: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", temas: ["cripto"] },
  {
    id: "google-banxico",
    nombre: "Google Noticias",
    url: "https://news.google.com/rss/search?q=Banxico&hl=es-419&gl=MX&ceid=MX:es-419",
    temas: ["banxico"],
  },
];

const ECONOMIA =
  /econom|financ|mercad|bolsa|\bBMV\b|peso|d[oó]lar|Banxico|inflaci|tasa|empleo|\bPIB\b|Hacienda|\bSHCP\b|inversi|empresa|banco|cr[eé]dito|petr[oó]leo|Pemex|arancel|T-MEC|remesas|Wall Street|Fed\b|bitcoin|cripto/i;

const TEMAS = [
  ["fed", /\bFed\b|Federal Reserve|FOMC|Powell|Reserva Federal/i],
  ["banxico", /Banxico|Banco de M[eé]xico/i],
  ["cripto", /bitcoin|ethereum|cripto|crypto|stablecoin/i],
  ["mexico", /M[eé]xico|INEGI|\bINPC\b|\bBMV\b|peso mexicano|Hacienda|Pemex/i],
  ["economia-eeuu", /\bCPI\b|inflation|payrolls|jobs report|\bGDP\b|unemployment|\bPCE\b|Treasury/i],
  ["mercados", /S&P|Nasdaq|\bDow\b|stocks|Wall Street|\bBMV\b|bolsa|acciones/i],
];

/** Palabras que ligan una noticia con un activo del catálogo. */
export const PALABRAS_ACTIVO = {
  sp500: /S&P ?500|\bSPX\b|\bVOO\b|\bSPY\b|\bIVV\b/i,
  nasdaq: /Nasdaq/i,
  dow: /Dow Jones|\bthe Dow\b/i,
  ipc: /\bIPC\b|\bBMV\b|Bolsa Mexicana/i,
  btc: /bitcoin|\bBTC\b/i,
  eth: /ethereum|\bETH\b|\bether\b/i,
  usdmxn: /peso mexicano|super ?peso|tipo de cambio|USD\/MXN|d[oó]lar.{0,20}peso|peso.{0,20}d[oó]lar/i,
  oro: /\boro\b|\bgold\b/i,
  wti: /petr[oó]leo|\bcrude\b|\boil\b|\bWTI\b/i,
  bono10: /Treasury yields?|10-year|bono a 10 a[nñ]os/i,
  aapl: /\bApple\b/i,
  msft: /Microsoft/i,
  nvda: /Nvidia/i,
  amzn: /Amazon/i,
  googl: /Alphabet|Google\b/i,
  meta: /\bMeta\b|Facebook/i,
  tsla: /Tesla/i,
  brkb: /Berkshire/i,
  jpm: /JPMorgan/i,
  walmex: /Walmart de M[eé]xico|Walmex/i,
  amx: /Am[eé]rica M[oó]vil/i,
  gfnorte: /Banorte/i,
  femsa: /\bFEMSA\b/i,
  gmexico: /Grupo M[eé]xico/i,
  cemex: /Cemex/i,
};

const CRITICA = [
  /FOMC statement/i,
  /Banxico.{0,40}(recorta|baja|sube|mantiene|reduce|eleva|deja).{0,30}tasa/i,
  /(anuncio|decisi[oó]n) de pol[ií]tica monetaria/i,
];
const IMPORTANTE = /\bCPI\b|inflaci[oó]n|inflation|payrolls|n[oó]mina|jobs report|\bGDP\b|\bPIB\b|arancel|tariff|Powell|recesi[oó]n|recession/i;

export function prioridad(texto, feed) {
  if (CRITICA.some((patron) => patron.test(texto))) return "critica";
  if (feed.oficial || IMPORTANTE.test(texto)) return "importante";
  return "informativa";
}

/** Hash corto y estable (FNV-1a) para identificar cada noticia por su enlace. */
export function idDe(texto) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

const VACIAS = new Set("el la los las de del un una y o a en por para con que se su sus al lo es the a an of to in on for and is are as at by with from".split(" "));

function palabras(titulo) {
  return new Set(
    titulo
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(" ")
      .filter((palabra) => palabra.length > 2 && !VACIAS.has(palabra)),
  );
}

/** Parecido entre titulares (Jaccard de sus palabras). */
export function parecido(a, b) {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let comunes = 0;
  for (const palabra of pa) if (pb.has(palabra)) comunes += 1;
  return comunes / (pa.size + pb.size - comunes);
}

/** Convierte las noticias de un feed al formato publicado. */
export function clasificar(feed, crudas) {
  return crudas
    .filter((noticia) => !feed.soloEconomia || ECONOMIA.test(`${noticia.titulo} ${noticia.resumen}`))
    .map((noticia) => {
      // Google Noticias agrega " - Medio" al final del titular.
      const medio = feed.id.startsWith("google") ? (/ - ([^-]+)$/.exec(noticia.titulo)?.[1] ?? null) : null;
      const titulo = medio ? noticia.titulo.slice(0, -(medio.length + 3)) : noticia.titulo;
      const texto = `${titulo} ${noticia.resumen}`;
      const temas = new Set(feed.temas);
      for (const [tema, patron] of TEMAS) if (patron.test(texto)) temas.add(tema);
      const activos = Object.entries(PALABRAS_ACTIVO)
        .filter(([, patron]) => patron.test(texto))
        .map(([id]) => id);
      return {
        id: idDe(noticia.enlace),
        titulo,
        enlace: noticia.enlace,
        fuente: medio ? `${medio} (vía Google Noticias)` : feed.nombre,
        fecha: noticia.fecha,
        resumen: noticia.resumen,
        temas: [...temas],
        activos,
        prioridad: prioridad(texto, feed),
        otrasFuentes: [],
      };
    });
}

/**
 * Junta noticias nuevas con las ya publicadas: quita las de más de `dias` días, agrupa las
 * parecidas (misma noticia en varias fuentes) y deja las más recientes primero.
 */
export function combinar(nuevas, anteriores, ahora, dias = 4, maximo = 150) {
  const limite = ahora.getTime() - dias * 86_400_000;
  const todas = [...nuevas, ...anteriores].filter((noticia) => {
    const ms = noticia.fecha ? Date.parse(noticia.fecha) : ahora.getTime();
    return ms >= limite && ms <= ahora.getTime() + 3_600_000;
  });
  todas.sort((a, b) => Date.parse(b.fecha ?? 0) - Date.parse(a.fecha ?? 0));
  const resultado = [];
  const vistos = new Set();
  for (const noticia of todas) {
    if (vistos.has(noticia.id)) continue;
    vistos.add(noticia.id);
    const igual = resultado.find((otra) => parecido(otra.titulo, noticia.titulo) >= 0.6);
    if (igual) {
      if (!igual.otrasFuentes.some((fuente) => fuente.enlace === noticia.enlace) && igual.fuente !== noticia.fuente) {
        igual.otrasFuentes.push({ fuente: noticia.fuente, enlace: noticia.enlace });
      }
      continue;
    }
    resultado.push({ ...noticia, otrasFuentes: [...(noticia.otrasFuentes ?? [])] });
    if (resultado.length >= maximo) break;
  }
  return resultado;
}

export async function bajarNoticias(obtenerTexto, anteriores, ahora) {
  const nuevas = [];
  const estado = [];
  for (const feed of FEEDS) {
    try {
      const crudas = leerFeed(await obtenerTexto(feed.url));
      const clasificadas = clasificar(feed, crudas);
      nuevas.push(...clasificadas);
      estado.push({ id: feed.id, nombre: feed.nombre, estado: "ok", total: clasificadas.length });
    } catch (error) {
      estado.push({ id: feed.id, nombre: feed.nombre, estado: "error", mensaje: String(error?.message ?? error).slice(0, 120) });
    }
  }
  return { noticias: combinar(nuevas, anteriores, ahora), fuentes: estado };
}
