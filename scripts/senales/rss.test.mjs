import { describe, expect, it } from "vitest";
import { decodificar, leerFeed, textoPlano } from "./rss.mjs";

describe("leerFeed", () => {
  it("lee RSS 2.0 con CDATA, entidades y HTML en el resumen", () => {
    const xml = `<?xml version="1.0"?><rss><channel><title>Fuente</title>
      <item><title><![CDATA[Banxico baja la tasa &amp; el peso sube]]></title>
      <link>https://ejemplo.mx/nota-1</link>
      <pubDate>Thu, 05 Nov 2026 19:00:00 GMT</pubDate>
      <description>&lt;p&gt;La Junta de Gobierno decidió&lt;/p&gt; reducir</description></item>
      <item><title>Sin enlace</title></item>
    </channel></rss>`;
    expect(leerFeed(xml)).toEqual([
      {
        titulo: "Banxico baja la tasa & el peso sube",
        enlace: "https://ejemplo.mx/nota-1",
        fecha: "2026-11-05T19:00:00.000Z",
        resumen: "La Junta de Gobierno decidió reducir",
      },
    ]);
  });

  it("lee Atom con enlace en atributo", () => {
    const xml = `<feed><entry><title>Fed statement</title><link rel="alternate" href="https://fed.gov/a?x=1&amp;y=2"/>
      <updated>2026-10-28T18:00:00Z</updated><summary>Rates unchanged</summary></entry></feed>`;
    expect(leerFeed(xml)).toEqual([
      { titulo: "Fed statement", enlace: "https://fed.gov/a?x=1&y=2", fecha: "2026-10-28T18:00:00.000Z", resumen: "Rates unchanged" },
    ]);
  });
});

describe("decodificar y textoPlano", () => {
  it("decodifica entidades numéricas y nombradas", () => {
    expect(decodificar("Inflaci&#243;n &#x26; &quot;tasas&quot;")).toBe('Inflación & "tasas"');
    expect(textoPlano("<b>Hola</b>&nbsp; <i>mundo</i>")).toBe("Hola mundo");
  });
});
