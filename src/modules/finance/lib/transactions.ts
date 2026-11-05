import Big from "big.js";
import { ISO_DATE_PATTERN, RATE_PATTERN, transactionSchema } from "../types";
import type { Account, Category, PaymentMethod, Transaction, TransactionType } from "../types";
import type { IsoDate } from "@/lib/dates";
import type { Currency } from "@/lib/money";

/** Arma y valida un movimiento antes de guardarlo. Los errores dicen qué corregir. */

export type FxInput = { rate: string; date: IsoDate; source: string };

export type TransactionDraft = {
  type: TransactionType;
  amountCents: number;
  currency: Currency;
  fx: FxInput | null;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  paymentMethod: PaymentMethod | null;
  date: IsoDate;
  note: string;
  /** Etiquetas separadas por comas, como las escribe el usuario. */
  tags: string;
};

export type DraftField = "monto" | "categoria" | "cuenta" | "tipoCambio" | "fecha" | "nota";

export type BuildResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; field: DraftField; error: string };

/** Hace falta tipo de cambio si el movimiento o alguna de sus cuentas está en dólares. */
export function needsFxRate(currency: Currency, accountCurrencies: Currency[]): boolean {
  return currency === "USD" || accountCurrencies.includes("USD");
}

export function isValidRate(rate: string): boolean {
  return RATE_PATTERN.test(rate) && new Big(rate).gt(0);
}

/** "viaje, Trabajo ,viaje" → ["viaje", "Trabajo"]: sin repetidas, máximo 10 de 30 letras. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of text.split(",")) {
    const tag = raw.trim().slice(0, 30);
    if (tag === "" || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags.slice(0, 10);
}

type BuildContext = {
  accounts: Account[];
  categories: Category[];
  /** Id nuevo, o el del movimiento que se edita. */
  id: string;
  now: number;
  existing?: Transaction;
};

export function buildTransaction(draft: TransactionDraft, context: BuildContext): BuildResult {
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0) {
    return { ok: false, field: "monto", error: "Escribe un monto mayor a cero." };
  }

  const from = context.accounts.find((account) => account.id === draft.accountId);
  if (!from) return { ok: false, field: "cuenta", error: "Elige una cuenta." };

  const isTransfer = draft.type === "transferencia";
  const to = isTransfer ? context.accounts.find((account) => account.id === draft.toAccountId) : undefined;
  if (isTransfer) {
    if (!to) return { ok: false, field: "cuenta", error: "Elige la cuenta que recibe." };
    if (to.id === from.id) return { ok: false, field: "cuenta", error: "Elige dos cuentas distintas." };
  }

  let categoryId: string | null = null;
  if (!isTransfer) {
    const category = context.categories.find((item) => item.id === draft.categoryId);
    if (!category || category.type !== draft.type) {
      return { ok: false, field: "categoria", error: "Elige una categoría." };
    }
    categoryId = category.id;
  }

  const fxNeeded = needsFxRate(draft.currency, [from.currency, ...(to ? [to.currency] : [])]);
  const rate = draft.fx?.rate.trim() ?? "";
  if (fxNeeded && (!draft.fx || !isValidRate(rate) || !ISO_DATE_PATTERN.test(draft.fx.date))) {
    return { ok: false, field: "tipoCambio", error: "Escribe el tipo de cambio: cuántos pesos vale 1 dólar." };
  }

  if (!ISO_DATE_PATTERN.test(draft.date)) return { ok: false, field: "fecha", error: "Elige una fecha." };

  const note = draft.note.trim();
  if (note.length > 280) return { ok: false, field: "nota", error: "La nota puede tener hasta 280 letras." };

  const parsed = transactionSchema.safeParse({
    id: context.id,
    type: draft.type,
    amountCents: draft.amountCents,
    currency: draft.currency,
    fxRate: fxNeeded ? rate : null,
    fxSource: fxNeeded ? (draft.fx?.source ?? null) : null,
    fxDate: fxNeeded ? (draft.fx?.date ?? null) : null,
    categoryId,
    accountId: from.id,
    toAccountId: to?.id ?? null,
    paymentMethod: isTransfer ? null : draft.paymentMethod,
    date: draft.date,
    note,
    tags: parseTags(draft.tags),
    createdAt: context.existing?.createdAt ?? context.now,
    updatedAt: context.now,
  } satisfies Transaction);
  if (!parsed.success) return { ok: false, field: "monto", error: "Revisa los datos del movimiento." };
  return { ok: true, transaction: parsed.data };
}
