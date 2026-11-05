import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "../defaults";
import { buildTransaction, isValidRate, needsFxRate, parseTags, type TransactionDraft } from "./transactions";
import { account } from "./test-data";

const accounts = [
  account({ id: "efectivo", kind: "efectivo" }),
  account({ id: "banco" }),
  account({ id: "broker", currency: "USD" }),
];
const context = { accounts, categories: DEFAULT_CATEGORIES, id: "nuevo", now: 1_000 };

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
  return {
    type: "gasto",
    amountCents: 25_000,
    currency: "MXN",
    fx: null,
    categoryId: "gasto-comida",
    accountId: "efectivo",
    toAccountId: null,
    paymentMethod: null,
    date: "2026-11-05",
    note: "",
    tags: "",
    ...overrides,
  };
}

describe("buildTransaction", () => {
  it("arma un gasto en pesos con la fecha y las etiquetas", () => {
    const result = buildTransaction(draft({ note: "  tacos ", tags: "viaje, trabajo" }), context);
    expect(result).toEqual({
      ok: true,
      transaction: {
        id: "nuevo",
        type: "gasto",
        amountCents: 25_000,
        currency: "MXN",
        fxRate: null,
        fxSource: null,
        fxDate: null,
        categoryId: "gasto-comida",
        accountId: "efectivo",
        toAccountId: null,
        paymentMethod: null,
        date: "2026-11-05",
        note: "tacos",
        tags: ["viaje", "trabajo"],
        createdAt: 1_000,
        updatedAt: 1_000,
      },
    });
  });

  it("pide monto, cuenta y una categoría del mismo tipo", () => {
    expect(buildTransaction(draft({ amountCents: 0 }), context)).toMatchObject({ ok: false, field: "monto" });
    expect(buildTransaction(draft({ accountId: null }), context)).toMatchObject({ ok: false, field: "cuenta" });
    expect(buildTransaction(draft({ categoryId: null }), context)).toMatchObject({ ok: false, field: "categoria" });
    expect(buildTransaction(draft({ categoryId: "ingreso-salario" }), context)).toMatchObject({
      ok: false,
      field: "categoria",
    });
  });

  it("pide tipo de cambio si hay dólares de por medio y lo guarda con su fuente y fecha", () => {
    expect(buildTransaction(draft({ currency: "USD" }), context)).toMatchObject({ ok: false, field: "tipoCambio" });
    const fx = { rate: "18.25", date: "2026-11-04", source: "manual" };
    const result = buildTransaction(draft({ currency: "USD", amountCents: 2_000, fx }), context);
    expect(result).toMatchObject({
      ok: true,
      transaction: { fxRate: "18.25", fxSource: "manual", fxDate: "2026-11-04" },
    });
  });

  it("una transferencia no lleva categoría y necesita dos cuentas distintas", () => {
    const transfer = draft({ type: "transferencia", accountId: "efectivo", toAccountId: "banco" });
    expect(buildTransaction(transfer, context)).toMatchObject({
      ok: true,
      transaction: { categoryId: null, toAccountId: "banco", paymentMethod: null },
    });
    expect(buildTransaction({ ...transfer, toAccountId: "efectivo" }, context)).toMatchObject({
      ok: false,
      field: "cuenta",
    });
    // Hacia una cuenta en dólares hace falta el tipo de cambio.
    expect(buildTransaction({ ...transfer, toAccountId: "broker" }, context)).toMatchObject({
      ok: false,
      field: "tipoCambio",
    });
  });

  it("al editar conserva el id y la fecha de creación", () => {
    const first = buildTransaction(draft(), context);
    if (!first.ok) throw new Error(first.error);
    const edited = buildTransaction(draft({ amountCents: 30_000 }), {
      ...context,
      id: first.transaction.id,
      now: 5_000,
      existing: first.transaction,
    });
    expect(edited).toMatchObject({ ok: true, transaction: { id: "nuevo", createdAt: 1_000, updatedAt: 5_000 } });
  });
});

describe("needsFxRate e isValidRate", () => {
  it("piden tipo de cambio solo cuando hay dólares", () => {
    expect(needsFxRate("MXN", ["MXN"])).toBe(false);
    expect(needsFxRate("USD", ["MXN"])).toBe(true);
    expect(needsFxRate("MXN", ["MXN", "USD"])).toBe(true);
  });

  it("aceptan solo tipos de cambio positivos escritos como número", () => {
    expect(isValidRate("18.5")).toBe(true);
    expect(isValidRate("0")).toBe(false);
    expect(isValidRate("0.000000")).toBe(false);
    expect(isValidRate("18,50")).toBe(false);
    expect(isValidRate("-18")).toBe(false);
  });
});

describe("parseTags", () => {
  it("limpia espacios, quita repetidas y limita la cantidad", () => {
    expect(parseTags(" viaje, Trabajo ,, viaje ,TRABAJO")).toEqual(["viaje", "Trabajo"]);
    expect(parseTags(Array.from({ length: 12 }, (_, i) => `t${i}`).join(","))).toHaveLength(10);
  });
});
