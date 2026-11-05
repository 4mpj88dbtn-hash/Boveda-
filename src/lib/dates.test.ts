import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cancunInstant,
  daysBetweenInclusive,
  addDaysToIsoDate,
  formatDayHeading,
  formatMonth,
  shiftMonth,
  formatDate,
  formatDateWithWeekday,
  greetingFor,
  monthRange,
  todayInCancun,
  weekRange,
} from "./dates";

// Cancún es UTC−5 todo el año. Para probar que el resultado no depende de la zona del
// equipo, las pruebas corren con el reloj del sistema en Kiritimati (UTC+14).
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Pacific/Kiritimati";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe("todayInCancun", () => {
  it("usa el día de Cancún aunque en UTC ya sea mañana", () => {
    // 04:30 UTC del 6 de noviembre = 23:30 del 5 de noviembre en Cancún.
    expect(todayInCancun(new Date("2026-11-06T04:30:00Z"))).toBe("2026-11-05");
    // 05:00 UTC = medianoche en Cancún.
    expect(todayInCancun(new Date("2026-11-06T05:00:00Z"))).toBe("2026-11-06");
  });

  it("no cambia con el horario de verano de EE. UU. (Cancún no lo usa)", () => {
    // 15 de julio, 04:59 UTC = 23:59 del 14 de julio en Cancún.
    expect(todayInCancun(new Date("2026-07-15T04:59:00Z"))).toBe("2026-07-14");
  });
});

describe("greetingFor", () => {
  it.each([
    ["2026-11-05T09:59:00Z", "Buenas noches"], // 04:59 en Cancún
    ["2026-11-05T10:00:00Z", "Buenos días"], // 05:00
    ["2026-11-05T16:59:00Z", "Buenos días"], // 11:59
    ["2026-11-05T17:00:00Z", "Buenas tardes"], // 12:00
    ["2026-11-05T23:59:00Z", "Buenas tardes"], // 18:59
    ["2026-11-06T00:00:00Z", "Buenas noches"], // 19:00
  ])("a las %s UTC dice %s", (instant, greeting) => {
    expect(greetingFor(new Date(instant))).toBe(greeting);
  });
});

describe("weekRange", () => {
  it("va de lunes a domingo", () => {
    // El 5 de noviembre de 2026 es jueves: la semana va del lunes 2 al domingo 8.
    expect(weekRange("2026-11-05")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
  });

  it("el domingo pertenece a la semana que empezó el lunes anterior", () => {
    expect(weekRange("2026-11-08")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(weekRange("2026-11-09")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("cruza meses y años", () => {
    // El 1 de enero de 2027 es viernes.
    expect(weekRange("2027-01-01")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });
});

describe("monthRange", () => {
  it("respeta los años bisiestos", () => {
    expect(monthRange("2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-11-05")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });
});

describe("formatDate", () => {
  it("usa dd/mm/aaaa", () => {
    expect(formatDate("2026-11-05")).toBe("05/11/2026");
  });

  it("rechaza fechas que no existen", () => {
    expect(() => formatDate("2026-02-30")).toThrow(RangeError);
    expect(() => formatDate("05/11/2026")).toThrow(RangeError);
  });

  it("agrega el día de la semana de Cancún", () => {
    // 03:00 UTC del viernes 6 = 22:00 del jueves 5 en Cancún.
    expect(formatDateWithWeekday(new Date("2026-11-06T03:00:00Z"))).toBe("jueves 05/11/2026");
  });
});

describe("meses y días del historial", () => {
  it("mueve meses cruzando el año", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(shiftMonth("2026-03", 0)).toBe("2026-03");
  });

  it("nombra el mes y los días en español", () => {
    expect(formatMonth("2026-11")).toBe("noviembre de 2026");
    expect(formatDayHeading("2026-11-05", "2026-11-05")).toBe("Hoy");
    expect(formatDayHeading("2026-11-04", "2026-11-05")).toBe("Ayer");
    // 1 de noviembre de 2026 fue domingo.
    expect(formatDayHeading("2026-11-01", "2026-11-05")).toBe("domingo 01/11/2026");
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("cancunInstant y daysBetweenInclusive", () => {
  it("el domingo 8 de noviembre a las 20:00 en Cancún es el lunes 9 a la 01:00 UTC", () => {
    expect(cancunInstant("2026-11-08", 20).toISOString()).toBe("2026-11-09T01:00:00.000Z");
    expect(cancunInstant("2026-12-01", 9).toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });

  it("cuenta días de calendario incluyendo ambos extremos", () => {
    expect(daysBetweenInclusive("2026-11-01", "2026-11-30")).toBe(30);
    expect(daysBetweenInclusive("2026-12-31", "2027-01-01")).toBe(2);
    expect(daysBetweenInclusive("2026-11-05", "2026-11-04")).toBe(0);
  });
});
