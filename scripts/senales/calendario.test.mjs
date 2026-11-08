import { describe, expect, it } from "vitest";
import { combinarEventos, horaNuevaYork, leerBea, leerFechasFred, leerFomc, leerResultados } from "./calendario.mjs";

describe("horaNuevaYork", () => {
  it("usa el horario de verano o de invierno de Nueva York", () => {
    // 28 de enero (EST, UTC−5): 14:00 NY = 19:00 UTC. 29 de julio (EDT, UTC−4): 14:00 NY = 18:00 UTC.
    expect(horaNuevaYork("2026-01-28", 14)).toBe("2026-01-28T19:00:00.000Z");
    expect(horaNuevaYork("2026-07-29", 14)).toBe("2026-07-29T18:00:00.000Z");
  });
});

describe("leerFomc", () => {
  // Fragmento con la estructura real de federalreserve.gov (08/11/2026).
  const html = `<div><h4><a id="1">2026 FOMC Meetings</a></h4></div>
    <div class="row fomc-meeting" "> <div class="fomc-meeting__month col-xs-5 col-sm-3 col-md-2"><strong>January</strong></div>
    <div class="fomc-meeting__date col-xs-4 col-sm-9 col-md-10 col-lg-1">27-28</div></div>
    <div class="fomc-meeting--shaded row fomc-meeting" "> <div class="fomc-meeting--shaded fomc-meeting__month col-xs-5 col-sm-3 col-md-2"><strong>March</strong></div>
    <div class="fomc-meeting__date col-xs-4 col-sm-9 col-md-10 col-lg-1">17-18*</div></div>
    <div class="row fomc-meeting" "> <div class="fomc-meeting__month col-xs-5"><strong>Apr/May</strong></div>
    <div class="fomc-meeting__date col-xs-4">30-1</div></div>
    <h4><a id="2">2027 FOMC Meetings</a></h4></div>
    <div class="row fomc-meeting" "> <div class="fomc-meeting__month col-xs-5 col-sm-3 col-md-2"><strong>January</strong></div>
    <div class="fomc-meeting__date col-xs-4 col-sm-9 col-md-10 col-lg-1">26-27</div></div>`;

  it("toma el último día de cada reunión, a las 14:00 de Nueva York", () => {
    const eventos = leerFomc(html);
    expect(eventos.map((evento) => evento.id)).toEqual(["fomc-2026-01-28", "fomc-2026-03-18", "fomc-2026-05-01", "fomc-2027-01-27"]);
    expect(eventos[0]?.fecha).toBe("2026-01-28T19:00:00.000Z");
    expect(eventos[1]?.detalle).toMatch(/proyecciones/);
  });
});

describe("leerBea", () => {
  it("toma el PIB y el PCE con su hora", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:GDP (Advance Estimate)\\, 3rd Quarter 2027",
      "DTSTART:20271028T123000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "SUMMARY:Personal Income and Outlays\\, October 2027",
      "DTSTART:20271124T133000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "SUMMARY:U.S. International Trade in Goods and Services\\, August 2027",
      "DTSTART:20271006T123000Z",
      "END:VEVENT",
    ].join("\r\n");
    expect(leerBea(ics).map((evento) => [evento.titulo, evento.fecha])).toEqual([
      ["PIB de EE. UU. (primera estimación)", "2027-10-28T12:30:00.000Z"],
      ["Ingreso y gasto personal de EE. UU. (inflación PCE)", "2027-11-24T13:30:00.000Z"],
    ]);
  });
});

describe("FRED y Finnhub", () => {
  it("convierte fechas de publicación a las 8:30 de Nueva York", () => {
    const [evento] = leerFechasFred({ release_dates: [{ release_id: 10, date: "2026-11-10" }] }, "cpi");
    expect(evento).toMatchObject({ titulo: "Inflación de EE. UU. (CPI)", fecha: "2026-11-10T13:30:00.000Z" });
  });

  it("solo toma empresas de la lista", () => {
    const json = { earningsCalendar: [{ symbol: "NVDA", date: "2026-11-19", hour: "amc" }, { symbol: "XYZ", date: "2026-11-19" }] };
    const eventos = leerResultados(json, [{ simbolo: "NVDA", nombre: "NVIDIA" }]);
    expect(eventos.map((evento) => evento.titulo)).toEqual(["Resultados de NVIDIA"]);
    expect(eventos[0]?.detalle).toBe("Reporte trimestral, después del cierre.");
  });
});

describe("combinarEventos", () => {
  it("conserva los eventos de las fuentes que fallaron y quita los viejos", () => {
    const ahora = new Date("2026-11-08T00:00:00Z");
    const anteriores = [
      { id: "a", fuente: "BEA", fecha: "2026-11-25T13:30:00.000Z" },
      { id: "b", fuente: "Reserva Federal", fecha: "2026-12-09T19:00:00.000Z" },
      { id: "viejo", fuente: "BEA", fecha: "2026-10-01T13:30:00.000Z" },
    ];
    const nuevos = [{ id: "c", fuente: "Reserva Federal", fecha: "2027-01-27T19:00:00.000Z" }];
    // Solo la Fed respondió: de BEA se conserva lo anterior; de la Fed, solo lo nuevo.
    expect(combinarEventos(nuevos, anteriores, new Set(["Reserva Federal"]), ahora).map((evento) => evento.id)).toEqual(["a", "c"]);
  });
});
