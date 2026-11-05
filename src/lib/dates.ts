import { TZDate } from "@date-fns/tz";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

/**
 * Fechas en Bóveda. "Hoy" siempre se calcula en la zona horaria de Cancún, sin importar
 * en qué zona corra el servidor o el navegador. Las fechas de calendario se manejan como
 * texto "aaaa-mm-dd".
 */

export const APP_TIME_ZONE = "America/Cancun";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha de calendario en formato "aaaa-mm-dd". */
export type IsoDate = string;

function parseIsoDate(date: IsoDate): TZDate {
  const match = ISO_DATE.exec(date);
  if (!match) throw new RangeError(`Fecha inválida: ${date}. Usa el formato aaaa-mm-dd.`);
  const [, year, month, day] = match;
  const parsed = new TZDate(Number(year), Number(month) - 1, Number(day), APP_TIME_ZONE);
  if (format(parsed, "yyyy-MM-dd") !== date) {
    throw new RangeError(`Fecha inválida: ${date}.`);
  }
  return parsed;
}

function toIsoDate(date: TZDate): IsoDate {
  return format(date, "yyyy-MM-dd");
}

/** El momento dado, visto con el reloj de Cancún. */
export function inCancun(instant: Date): TZDate {
  return new TZDate(instant, APP_TIME_ZONE);
}

/** Fecha de hoy en Cancún ("aaaa-mm-dd"). */
export function todayInCancun(now: Date = new Date()): IsoDate {
  return toIsoDate(inCancun(now));
}

export type Greeting = "Buenos días" | "Buenas tardes" | "Buenas noches";

/**
 * Saludo según la hora de Cancún: buenos días de 5:00 a 11:59, buenas tardes de 12:00
 * a 18:59 y buenas noches de 19:00 a 4:59.
 */
export function greetingFor(now: Date): Greeting {
  const hour = inCancun(now).getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Semana de lunes a domingo que contiene la fecha. */
export function weekRange(date: IsoDate): { start: IsoDate; end: IsoDate } {
  const start = startOfWeek(parseIsoDate(date), { weekStartsOn: 1 });
  return { start: toIsoDate(start), end: toIsoDate(addDays(start, 6)) };
}

/** Primer y último día del mes que contiene la fecha. */
export function monthRange(date: IsoDate): { start: IsoDate; end: IsoDate } {
  const parsed = parseIsoDate(date);
  return { start: toIsoDate(startOfMonth(parsed)), end: toIsoDate(endOfMonth(parsed)) };
}

/** "2026-11-05" → "05/11/2026". */
export function formatDate(date: IsoDate): string {
  return format(parseIsoDate(date), "dd/MM/yyyy");
}

/** "jueves 05/11/2026", con el día de la semana de Cancún. */
export function formatDateWithWeekday(now: Date): string {
  const weekday = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    timeZone: APP_TIME_ZONE,
  }).format(now);
  return `${weekday} ${formatDate(todayInCancun(now))}`;
}
