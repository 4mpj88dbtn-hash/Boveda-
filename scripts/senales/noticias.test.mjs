import { describe, expect, it } from "vitest";
import { clasificar, combinar, FEEDS, parecido, prioridad } from "./noticias.mjs";

const feed = (id) => FEEDS.find((item) => item.id === id);
const ahora = new Date("2026-11-08T12:00:00Z");

describe("clasificar", () => {
  it("detecta temas, activos y prioridad", () => {
    const [noticia] = clasificar(feed("google-banxico"), [
      {
        titulo: "Banxico recorta la tasa de interés a 6.75%; el peso mexicano se aprecia - El Universal",
        enlace: "https://news.google.com/a",
        fecha: "2026-11-06T19:05:00.000Z",
        resumen: "",
      },
    ]);
    expect(noticia).toMatchObject({
      titulo: "Banxico recorta la tasa de interés a 6.75%; el peso mexicano se aprecia",
      fuente: "El Universal (vía Google Noticias)",
      prioridad: "critica",
      activos: ["usdmxn"],
    });
    expect(noticia?.temas).toEqual(expect.arrayContaining(["banxico", "mexico"]));
  });

  it("de los feeds generales solo deja noticias de economía", () => {
    const result = clasificar(feed("economista"), [
      { titulo: "Gana el América el clásico", enlace: "https://e.mx/1", fecha: null, resumen: "" },
      { titulo: "La BMV cierra con ganancias", enlace: "https://e.mx/2", fecha: null, resumen: "" },
    ]);
    expect(result.map((item) => item.titulo)).toEqual(["La BMV cierra con ganancias"]);
    expect(result[0]?.activos).toEqual(["ipc"]);
  });

  it("los comunicados de la Fed son importantes y el del FOMC, crítico", () => {
    expect(prioridad("Federal Reserve issues FOMC statement", feed("fed"))).toBe("critica");
    expect(prioridad("Minutes of the Federal Open Market Committee", feed("fed"))).toBe("importante");
    expect(prioridad("Apple sube 2%", feed("cnbc"))).toBe("informativa");
  });
});

describe("combinar", () => {
  const base = (titulo, enlace, fuente, fecha) => ({ id: enlace, titulo, enlace, fuente, fecha, resumen: "", temas: [], activos: [], prioridad: "informativa", otrasFuentes: [] });

  it("agrupa la misma noticia de varias fuentes y ordena de la más reciente", () => {
    const result = combinar(
      [
        base("Fed holds rates steady, Powell signals patience", "a", "CNBC", "2026-11-07T19:00:00Z"),
        base("Fed holds rates steady as Powell signals patience", "b", "MarketWatch", "2026-11-07T19:10:00Z"),
        base("Bitcoin sube 5%", "c", "CoinDesk", "2026-11-08T10:00:00Z"),
      ],
      [],
      ahora,
    );
    expect(result.map((item) => item.enlace)).toEqual(["c", "b"]);
    expect(result[1]?.otrasFuentes).toEqual([{ fuente: "CNBC", enlace: "a" }]);
  });

  it("quita las de más de 4 días y las repetidas por enlace", () => {
    const vieja = base("Noticia vieja", "v", "CNBC", "2026-11-01T00:00:00Z");
    const actual = base("Noticia actual", "n", "CNBC", "2026-11-08T00:00:00Z");
    expect(combinar([actual], [vieja, actual], ahora).map((item) => item.enlace)).toEqual(["n"]);
  });

  it("mide el parecido sin acentos ni palabras vacías", () => {
    expect(parecido("La inflación en México baja", "Inflacion en Mexico baja")).toBe(1);
    expect(parecido("Apple sube", "Tesla cae")).toBe(0);
  });
});
