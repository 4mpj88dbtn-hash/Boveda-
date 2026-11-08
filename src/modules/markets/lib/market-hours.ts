import { TZDate } from "@date-fns/tz";

/**
 * Horario de la Bolsa de Nueva York (NYSE) visto desde Cancún. Las horas se calculan con la
 * base de zonas horarias (America/New_York), así que el cambio de horario de EE. UU. sale solo:
 * la apertura de las 9:30 de Nueva York es a las 8:30 en Cancún en verano y a las 9:30 en invierno.
 *
 * Festivos según las reglas de la NYSE (verificadas contra su calendario oficial 2026–2027,
 * consultado el 08/11/2026). Un cierre extraordinario (por ejemplo, un día de duelo nacional)
 * no se puede prever.
 */

const NY = "America/New_York";

export type Holiday = { date: string; name: string };

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** Día de la semana (0 = domingo) de una fecha de calendario. */
function weekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** El n-ésimo día de la semana del mes (n = −1 para el último). */
function nthWeekday(year: number, month: number, dayOfWeek: number, n: number): number {
  if (n > 0) {
    const first = weekday(year, month, 1);
    return 1 + ((dayOfWeek - first + 7) % 7) + (n - 1) * 7;
  }
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = weekday(year, month, last);
  return last - ((lastDow - dayOfWeek + 7) % 7);
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Si cae en sábado se cierra el viernes; si cae en domingo, el lunes. */
function observed(year: number, month: number, day: number): string {
  const dow = weekday(year, month, day);
  const date = new Date(Date.UTC(year, month - 1, day + (dow === 6 ? -1 : dow === 0 ? 1 : 0)));
  return date.toISOString().slice(0, 10);
}

export function nyseHolidays(year: number): Holiday[] {
  const list: Holiday[] = [];
  // Año Nuevo: si cae en sábado, la NYSE no cierra el viernes anterior (es otro año).
  if (weekday(year, 1, 1) !== 6) list.push({ date: observed(year, 1, 1), name: "Año Nuevo" });
  list.push({ date: iso(year, 1, nthWeekday(year, 1, 1, 3)), name: "Día de Martin Luther King Jr." });
  list.push({ date: iso(year, 2, nthWeekday(year, 2, 1, 3)), name: "Día de los Presidentes" });
  const { month, day } = easter(year);
  const goodFriday = new Date(Date.UTC(year, month - 1, day - 2)).toISOString().slice(0, 10);
  list.push({ date: goodFriday, name: "Viernes Santo" });
  list.push({ date: iso(year, 5, nthWeekday(year, 5, 1, -1)), name: "Memorial Day" });
  if (year >= 2022) list.push({ date: observed(year, 6, 19), name: "Juneteenth" });
  list.push({ date: observed(year, 7, 4), name: "Día de la Independencia de EE. UU." });
  list.push({ date: iso(year, 9, nthWeekday(year, 9, 1, 1)), name: "Labor Day" });
  list.push({ date: iso(year, 11, nthWeekday(year, 11, 4, 4)), name: "Día de Acción de Gracias" });
  list.push({ date: observed(year, 12, 25), name: "Navidad" });
  // Año Nuevo del siguiente año en sábado: no se recorre al 31 de diciembre.
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Días con cierre a la 1:00 p.m. de Nueva York. */
export function nyseEarlyCloses(year: number): string[] {
  const days: string[] = [];
  // Víspera de la Independencia, si el 4 de julio cae de martes a viernes.
  const july4 = weekday(year, 7, 4);
  if (july4 >= 2 && july4 <= 5) days.push(iso(year, 7, 3));
  // Día después de Acción de Gracias.
  days.push(iso(year, 11, nthWeekday(year, 11, 4, 4) + 1));
  // Nochebuena, si el 25 cae de martes a viernes.
  const christmas = weekday(year, 12, 25);
  if (christmas >= 2 && christmas <= 5) days.push(iso(year, 12, 24));
  return days.sort();
}

export type MarketState = "abierto" | "preapertura" | "postcierre" | "cerrado";

export type MarketStatus = {
  state: MarketState;
  /** Motivo si está cerrado todo el día. */
  reason: "fin de semana" | "festivo" | null;
  holidayName: string | null;
  earlyClose: boolean;
  /** Próxima apertura (si no está abierto) o cierre de hoy (si está abierto). */
  nextChange: Date;
};

function nyDate(date: string, hour: number, minute: number): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(new TZDate(year, month - 1, day, hour, minute, 0, NY).getTime());
}

function isTradingDay(date: string): { trading: boolean; holiday: Holiday | null } {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const dow = weekday(year, month, day);
  if (dow === 0 || dow === 6) return { trading: false, holiday: null };
  const holiday = nyseHolidays(year).find((item) => item.date === date) ?? null;
  return { trading: holiday === null, holiday };
}

function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Estado de la NYSE en este momento. Pre-apertura de 4:00 a 9:30 y post-cierre hasta las 20:00 (Nueva York). */
export function nyseStatus(now: Date): MarketStatus {
  const ny = new TZDate(now.getTime(), NY);
  const today = iso(ny.getFullYear(), ny.getMonth() + 1, ny.getDate());
  const { trading, holiday } = isTradingDay(today);
  const earlyClose = trading && nyseEarlyCloses(ny.getFullYear()).includes(today);

  const nextOpenFrom = (start: string, includeToday: boolean): Date => {
    let date = includeToday ? start : addDays(start, 1);
    for (let guard = 0; guard < 15; guard += 1) {
      if (isTradingDay(date).trading) return nyDate(date, 9, 30);
      date = addDays(date, 1);
    }
    return nyDate(date, 9, 30);
  };

  if (!trading) {
    const dow = weekday(ny.getFullYear(), ny.getMonth() + 1, ny.getDate());
    return {
      state: "cerrado",
      reason: holiday ? "festivo" : dow === 0 || dow === 6 ? "fin de semana" : null,
      holidayName: holiday?.name ?? null,
      earlyClose: false,
      nextChange: nextOpenFrom(today, false),
    };
  }

  const open = nyDate(today, 9, 30);
  const close = nyDate(today, earlyClose ? 13 : 16, 0);
  const preStart = nyDate(today, 4, 0);
  const postEnd = nyDate(today, 20, 0);
  const t = now.getTime();
  if (t >= open.getTime() && t < close.getTime()) {
    return { state: "abierto", reason: null, holidayName: null, earlyClose, nextChange: close };
  }
  if (t >= preStart.getTime() && t < open.getTime()) {
    return { state: "preapertura", reason: null, holidayName: null, earlyClose, nextChange: open };
  }
  if (t >= close.getTime() && t < postEnd.getTime()) {
    return { state: "postcierre", reason: null, holidayName: null, earlyClose, nextChange: nextOpenFrom(today, false) };
  }
  return {
    state: "cerrado",
    reason: null,
    holidayName: null,
    earlyClose,
    nextChange: t < preStart.getTime() ? open : nextOpenFrom(today, false),
  };
}
