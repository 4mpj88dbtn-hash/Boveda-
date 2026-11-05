import type { IsoDate } from "@/lib/dates";
import { transactionSchema, type Account, type Recurring, type Transaction } from "../types";
import { needsFxRate } from "./transactions";

/**
 * Fechas de los movimientos recurrentes. Son fechas de calendario ("aaaa-mm-dd"), así que se
 * calculan sin zona horaria. Cada fecha sale de la fecha inicial, para no ir corriéndose:
 * "cada mes desde el 31 de enero" da 28 de febrero, 31 de marzo, 30 de abril…
 */

type Rule = Pick<Recurring, "frequency" | "startDate">;

const pad = (value: number) => String(value).padStart(2, "0");

function parts(date: IsoDate): { year: number; month: number; day: number } {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Suma meses sin pasarse del último día del mes. */
function addMonths(date: IsoDate, months: number): IsoDate {
  const { year, month, day } = parts(date);
  const index = year * 12 + (month - 1) + months;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${newYear}-${pad(newMonth)}-${pad(Math.min(day, daysInMonth(newYear, newMonth)))}`;
}

/** Fechas del paso k (casi siempre una; la quincena da dos). */
function datesAt(rule: Rule, step: number): IsoDate[] {
  switch (rule.frequency) {
    case "semanal":
      return [addDays(rule.startDate, 7 * step)];
    case "catorcenal":
      return [addDays(rule.startDate, 14 * step)];
    case "mensual":
      return [addMonths(rule.startDate, step)];
    case "anual":
      return [addMonths(rule.startDate, 12 * step)];
    case "quincenal": {
      const first = addMonths(`${rule.startDate.slice(0, 7)}-01`, step);
      const { year, month } = parts(first);
      return [`${year}-${pad(month)}-15`, `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`];
    }
  }
}

/** Todas las fechas de la regla en orden, desde la fecha inicial. */
export function* occurrences(rule: Rule): Generator<IsoDate> {
  // Tope de seguridad: 10,000 pasos son casi 200 años de una regla semanal.
  for (let step = 0; step < 10_000; step += 1) {
    for (const date of datesAt(rule, step)) if (date >= rule.startDate) yield date;
  }
}

/** La primera fecha estrictamente después de `date`. */
export function nextOccurrenceAfter(rule: Rule, date: IsoDate): IsoDate {
  for (const occurrence of occurrences(rule)) if (occurrence > date) return occurrence;
  throw new RangeError("La regla no tiene más fechas.");
}

/** Fechas pendientes: desde `nextDate` hasta hoy, como máximo `limit`. */
export function dueOccurrences(rule: Rule & Pick<Recurring, "nextDate">, today: IsoDate, limit = 60): IsoDate[] {
  const due: IsoDate[] = [];
  for (const occurrence of occurrences(rule)) {
    if (occurrence > today || due.length >= limit) break;
    if (occurrence >= rule.nextDate) due.push(occurrence);
  }
  return due;
}

export type RecurringPlan = {
  /** Movimientos que se registran solos. */
  create: Transaction[];
  /** Nueva fecha siguiente de cada regla que avanzó. */
  advance: { id: string; nextDate: IsoDate }[];
  /** Esperan tu confirmación: la fecha más antigua de cada regla. */
  pending: { rule: Recurring; date: IsoDate }[];
};

/**
 * Qué hacer hoy con las reglas: las automáticas se registran (con un id fijo por fecha, para
 * no duplicar si se procesa dos veces) y las demás quedan pendientes. Las que usan dólares
 * siempre piden confirmación, porque el tipo de cambio cambia.
 */
export function planRecurring(rules: Recurring[], accounts: Account[], today: IsoDate, now: number): RecurringPlan {
  const plan: RecurringPlan = { create: [], advance: [], pending: [] };
  const byId = new Map(accounts.map((account) => [account.id, account]));

  for (const rule of rules) {
    if (!rule.active || rule.nextDate > today) continue;
    const { template } = rule;
    const from = byId.get(template.accountId);
    const to = template.toAccountId === null ? undefined : byId.get(template.toAccountId);
    const usable = from && (template.toAccountId === null || to);
    const currencies = [from?.currency ?? "MXN", ...(to ? [to.currency] : [])];

    if (rule.mode === "confirmar" || !usable || needsFxRate(template.currency, currencies)) {
      plan.pending.push({ rule, date: rule.nextDate });
      continue;
    }

    const due = dueOccurrences(rule, today);
    const created = due
      .map((date) =>
        transactionSchema.safeParse({ ...template, id: `${rule.id}:${date}`, date, createdAt: now, updatedAt: now }),
      )
      .filter((result) => result.success)
      .map((result) => result.data);
    if (created.length !== due.length) {
      plan.pending.push({ rule, date: rule.nextDate });
      continue;
    }
    plan.create.push(...created);
    const last = due.at(-1);
    if (last) plan.advance.push({ id: rule.id, nextDate: nextOccurrenceAfter(rule, last) });
  }
  return plan;
}
