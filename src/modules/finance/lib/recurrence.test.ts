import { describe, expect, it } from "vitest";
import type { Recurring } from "../types";
import { dueOccurrences, nextOccurrenceAfter, occurrences, planRecurring } from "./recurrence";
import { account } from "./test-data";

function first(rule: Pick<Recurring, "frequency" | "startDate">, count: number): string[] {
  const dates: string[] = [];
  for (const date of occurrences(rule)) {
    dates.push(date);
    if (dates.length === count) break;
  }
  return dates;
}

describe("occurrences", () => {
  it("cada mes desde el 31 no se corre: usa el último día de los meses cortos", () => {
    expect(first({ frequency: "mensual", startDate: "2026-01-31" }, 5)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("cada semana y cada 2 semanas cuentan días exactos, cruzando el año", () => {
    expect(first({ frequency: "semanal", startDate: "2026-12-24" }, 3)).toEqual(["2026-12-24", "2026-12-31", "2027-01-07"]);
    expect(first({ frequency: "catorcenal", startDate: "2026-11-06" }, 3)).toEqual(["2026-11-06", "2026-11-20", "2026-12-04"]);
  });

  it("la quincena cae el 15 y el último día de cada mes", () => {
    expect(first({ frequency: "quincenal", startDate: "2027-01-20" }, 4)).toEqual([
      "2027-01-31",
      "2027-02-15",
      "2027-02-28",
      "2027-03-15",
    ]);
  });

  it("cada año desde el 29 de febrero usa el 28 en años no bisiestos", () => {
    expect(first({ frequency: "anual", startDate: "2028-02-29" }, 3)).toEqual(["2028-02-29", "2029-02-28", "2030-02-28"]);
  });
});

describe("nextOccurrenceAfter y dueOccurrences", () => {
  const rent = { frequency: "mensual" as const, startDate: "2026-09-01", nextDate: "2026-10-01" };

  it("da la siguiente fecha después de una dada", () => {
    expect(nextOccurrenceAfter(rent, "2026-10-01")).toBe("2026-11-01");
    expect(nextOccurrenceAfter(rent, "2026-10-15")).toBe("2026-11-01");
  });

  it("junta las fechas pendientes hasta hoy, sin repetir las ya registradas", () => {
    expect(dueOccurrences(rent, "2026-11-05")).toEqual(["2026-10-01", "2026-11-01"]);
    expect(dueOccurrences(rent, "2026-09-30")).toEqual([]);
  });
});

describe("planRecurring", () => {
  const accounts = [account({ id: "banco" }), account({ id: "broker", currency: "USD" })];
  const base: Recurring = {
    id: "renta",
    frequency: "mensual",
    startDate: "2026-10-01",
    nextDate: "2026-10-01",
    mode: "automatico",
    active: true,
    createdAt: 0,
    template: {
      type: "gasto",
      amountCents: 800_000,
      currency: "MXN",
      fxRate: null,
      fxSource: null,
      fxDate: null,
      categoryId: "gasto-casa",
      accountId: "banco",
      toAccountId: null,
      paymentMethod: "transferencia",
      note: "Renta",
      tags: [],
    },
  };

  it("registra solas las fechas vencidas y mueve la siguiente fecha", () => {
    const plan = planRecurring([base], accounts, "2026-11-05", 9);
    expect(plan.create.map((transaction) => [transaction.id, transaction.date])).toEqual([
      ["renta:2026-10-01", "2026-10-01"],
      ["renta:2026-11-01", "2026-11-01"],
    ]);
    expect(plan.create[0]).toMatchObject({ amountCents: 800_000, note: "Renta", createdAt: 9 });
    expect(plan.advance).toEqual([{ id: "renta", nextDate: "2026-12-01" }]);
    expect(plan.pending).toEqual([]);
  });

  it("deja pendientes las que piden confirmación, las de dólares y las de cuentas que ya no existen", () => {
    const confirm = { ...base, id: "a", mode: "confirmar" as const };
    const dollars = { ...base, id: "b", template: { ...base.template, accountId: "broker", currency: "USD" as const } };
    const missing = { ...base, id: "c", template: { ...base.template, accountId: "otra" } };
    const plan = planRecurring([confirm, dollars, missing], accounts, "2026-11-05", 0);
    expect(plan.create).toEqual([]);
    expect(plan.pending.map((item) => [item.rule.id, item.date])).toEqual([
      ["a", "2026-10-01"],
      ["b", "2026-10-01"],
      ["c", "2026-10-01"],
    ]);
  });

  it("ignora las pausadas y las que aún no tocan", () => {
    const paused = { ...base, active: false };
    const future = { ...base, id: "f", nextDate: "2026-12-01" };
    expect(planRecurring([paused, future], accounts, "2026-11-05", 0)).toEqual({ create: [], advance: [], pending: [] });
  });
});
