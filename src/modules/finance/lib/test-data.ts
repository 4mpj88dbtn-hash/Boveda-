import type { Account, Transaction } from "../types";

/** Datos de ejemplo para las pruebas. */

export function account(overrides: Partial<Account> & Pick<Account, "id">): Account {
  return {
    name: overrides.id,
    kind: "banco",
    currency: "MXN",
    openingBalanceCents: 0,
    archived: false,
    order: 0,
    createdAt: 0,
    ...overrides,
  };
}

export function movement(overrides: Partial<Transaction> & Pick<Transaction, "type" | "amountCents">): Transaction {
  return {
    id: `${overrides.type}-${overrides.amountCents}-${overrides.date ?? "2026-11-05"}`,
    currency: "MXN",
    fxRate: null,
    fxSource: null,
    fxDate: null,
    categoryId: overrides.type === "transferencia" ? null : "gasto-comida",
    accountId: "banco",
    toAccountId: null,
    paymentMethod: null,
    date: "2026-11-05",
    note: "",
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}
