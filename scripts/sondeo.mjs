#!/usr/bin/env node
/**
 * Sondeo temporal (se borra después): prueba qué fuentes públicas de noticias y calendarios
 * responden desde GitHub Actions identificándose como Bóveda. Las que no respondan así no se
 * usan. Solo imprime el estado y el inicio de cada respuesta.
 */
const UA = "Mozilla/5.0 (compatible; Boveda/1.0; +https://github.com/4mpj88dbtn-hash/Boveda-)";

const urls = [
  ["fed-monetaria", "https://www.federalreserve.gov/feeds/press_monetary.xml"],
  ["fed-todo", "https://www.federalreserve.gov/feeds/press_all.xml"],
  ["yahoo-rss", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,BTC-USD&region=US&lang=en-US"],
  ["cnbc-top", "https://www.cnbc.com/id/100003114/device/rss/rss.html"],
  ["cnbc-economia", "https://www.cnbc.com/id/20910258/device/rss/rss.html"],
  ["marketwatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories"],
  ["economista-mercados", "https://www.eleconomista.com.mx/rss/mercados"],
  ["economista-ultimas", "https://www.eleconomista.com.mx/rss/ultimas-noticias"],
  ["financiero", "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml"],
  ["expansion", "https://expansion.mx/rss/economia"],
  ["cointelegraph-es", "https://es.cointelegraph.com/rss"],
  ["coindesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"],
  ["google-banxico", "https://news.google.com/rss/search?q=Banxico&hl=es-419&gl=MX&ceid=MX:es-419"],
  ["google-negocios", "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=es-419&gl=MX&ceid=MX:es-419"],
  ["fomc-calendario", "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"],
  ["bls-ics", "https://www.bls.gov/schedule/news_release/bls.ics"],
  ["bea-ics", "https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics"],
  ["banxico-calendario", "https://www.banxico.org.mx/viewers2/JSP/calendarioDifusion_es.jsp"],
];

for (const [nombre, url] of urls) {
  try {
    const respuesta = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(20_000),
    });
    const texto = await respuesta.text();
    const muestra = texto.replace(/\s+/g, " ").slice(0, 300);
    console.log(`${nombre} ${respuesta.status} ${respuesta.headers.get("content-type")} ${texto.length} :: ${muestra}`);
  } catch (error) {
    console.log(`${nombre} ERROR ${error instanceof Error ? error.message : String(error)}`);
  }
}
