import { describe, expect, it } from "vitest";
import { nyseEarlyCloses, nyseHolidays, nyseStatus } from "./market-hours";

const cancun = (date: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Cancun",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

describe("festivos de la NYSE", () => {
  it("2026 coincide con el calendario oficial", () => {
    expect(nyseHolidays(2026).map((holiday) => holiday.date)).toEqual([
      "2026-01-01",
      "2026-01-19",
      "2026-02-16",
      "2026-04-03",
      "2026-05-25",
      "2026-06-19",
      "2026-07-03", // el 4 de julio cae en sábado
      "2026-09-07",
      "2026-11-26",
      "2026-12-25",
    ]);
    expect(nyseEarlyCloses(2026)).toEqual(["2026-11-27", "2026-12-24"]);
  });

  it("2027: Viernes Santo 26 de marzo, Juneteenth el viernes 18 y Navidad el viernes 24", () => {
    const dates = nyseHolidays(2027).map((holiday) => holiday.date);
    expect(dates).toEqual([
      "2027-01-01",
      "2027-01-18",
      "2027-02-15",
      "2027-03-26",
      "2027-05-31",
      "2027-06-18",
      "2027-07-05",
      "2027-09-06",
      "2027-11-25",
      "2027-12-24",
    ]);
    expect(nyseEarlyCloses(2027)).toEqual(["2027-11-26"]);
  });

  it("si Año Nuevo cae en sábado no se cierra el viernes anterior (2028 → 2022)", () => {
    expect(nyseHolidays(2022).map((holiday) => holiday.date)).not.toContain("2021-12-31");
    expect(nyseHolidays(2022)[0]?.date).toBe("2022-01-17");
  });
});

describe("estado del mercado en hora de Cancún", () => {
  it("en invierno abre a las 9:30 de Cancún (EST, misma hora que Cancún)", () => {
    // Lunes 9 de noviembre de 2026, 14:00 UTC = 9:00 en Nueva York y en Cancún → pre-apertura.
    const status = nyseStatus(new Date("2026-11-09T14:00:00Z"));
    expect(status.state).toBe("preapertura");
    expect(cancun(status.nextChange)).toBe("lunes 09:30");
  });

  it("en verano abre a las 8:30 de Cancún (EDT es una hora más que Cancún)", () => {
    // Lunes 8 de junio de 2026, 13:00 UTC = 9:00 en Nueva York = 8:00 en Cancún.
    const status = nyseStatus(new Date("2026-06-08T13:00:00Z"));
    expect(status.state).toBe("preapertura");
    expect(cancun(status.nextChange)).toBe("lunes 08:30");
  });

  it("abierto hasta las 16:00 de Nueva York, o a la 13:00 en cierre anticipado", () => {
    const open = nyseStatus(new Date("2026-11-09T18:00:00Z"));
    expect(open.state).toBe("abierto");
    expect(cancun(open.nextChange)).toBe("lunes 16:00");
    const early = nyseStatus(new Date("2026-11-27T17:00:00Z")); // viernes después de Acción de Gracias, 12:00 NY
    expect(early).toMatchObject({ state: "abierto", earlyClose: true });
    expect(cancun(early.nextChange)).toBe("viernes 13:00");
  });

  it("cerrado en fin de semana y en festivo, con la próxima apertura", () => {
    const weekend = nyseStatus(new Date("2026-11-08T18:00:00Z")); // domingo
    expect(weekend).toMatchObject({ state: "cerrado", reason: "fin de semana" });
    expect(cancun(weekend.nextChange)).toBe("lunes 09:30");
    const thanksgiving = nyseStatus(new Date("2026-11-26T16:00:00Z"));
    expect(thanksgiving).toMatchObject({ state: "cerrado", reason: "festivo", holidayName: "Día de Acción de Gracias" });
    expect(cancun(thanksgiving.nextChange)).toBe("viernes 09:30");
  });

  it("después del cierre la siguiente apertura salta festivos", () => {
    // Miércoles 25 de noviembre de 2026, 22:00 UTC (17:00 NY): post-cierre; jueves es festivo.
    const status = nyseStatus(new Date("2026-11-25T22:00:00Z"));
    expect(status.state).toBe("postcierre");
    expect(cancun(status.nextChange)).toBe("viernes 09:30");
  });
});
