import { z } from "zod";
import { CURRENCIES } from "@/lib/money";

/**
 * Datos de Finanzas: cuentas, categorías y movimientos. Los montos son enteros en centavos
 * con su moneda; los tipos de cambio, texto decimal ("18.50" = pesos por 1 dólar).
 */

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Tipo de cambio: número positivo con hasta 6 decimales, como texto ("18.5", "17.2345"). */
export const RATE_PATTERN = /^(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/;

const isoDate = z.string().regex(ISO_DATE_PATTERN);
const id = z.string().min(1).max(64);
const cents = z.number().int().safe();

export const ACCOUNT_KINDS = ["efectivo", "banco", "tarjeta", "inversion", "cripto", "bien", "deuda"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  efectivo: "Efectivo",
  banco: "Banco",
  tarjeta: "Tarjeta de crédito",
  inversion: "Inversión",
  cripto: "Cripto",
  bien: "Bien (auto, casa…)",
  deuda: "Préstamo o deuda",
};

/** Cuentas donde el saldo normal es lo que debes. */
export const LIABILITY_KINDS: readonly AccountKind[] = ["tarjeta", "deuda"];

export function isLiability(kind: AccountKind): boolean {
  return LIABILITY_KINDS.includes(kind);
}

export const accountSchema = z.object({
  id,
  name: z.string().trim().min(1).max(40),
  kind: z.enum(ACCOUNT_KINDS),
  currency: z.enum(CURRENCIES),
  /** Saldo con el que se dio de alta. Negativo si es lo que debes (tarjetas y deudas). */
  openingBalanceCents: cents,
  archived: z.boolean(),
  order: z.number().int(),
  createdAt: z.number(),
});
export type Account = z.infer<typeof accountSchema>;

export const CATEGORY_TYPES = ["gasto", "ingreso"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/** Grupo de la plantilla 50/30/20 (presupuestos, Fase 1 parte 2). */
export const BUDGET_GROUPS = ["necesidades", "deseos", "ahorro"] as const;

export const categorySchema = z.object({
  id,
  type: z.enum(CATEGORY_TYPES),
  name: z.string().trim().min(1).max(30),
  icon: z.string().min(1).max(40),
  /** Categoría madre si es una subcategoría. */
  parentId: id.nullable(),
  group: z.enum(BUDGET_GROUPS).nullable(),
  archived: z.boolean(),
  order: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export const TRANSACTION_TYPES = ["gasto", "ingreso", "transferencia"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  gasto: "Gasto",
  ingreso: "Ingreso",
  transferencia: "Transferencia",
};

export const PAYMENT_METHODS = ["efectivo", "debito", "credito", "transferencia"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
};

export const transactionSchema = z.object({
  id,
  type: z.enum(TRANSACTION_TYPES),
  /** Siempre positivo; el tipo define si entra o sale. */
  amountCents: cents.positive(),
  currency: z.enum(CURRENCIES),
  /** Pesos por 1 dólar. Obligatorio si el movimiento o alguna de sus cuentas está en USD. */
  fxRate: z.string().regex(RATE_PATTERN).nullable(),
  /** De dónde salió el tipo de cambio ("manual" = lo escribiste tú). */
  fxSource: z.string().max(60).nullable(),
  fxDate: isoDate.nullable(),
  categoryId: id.nullable(),
  accountId: id,
  /** Solo transferencias: la cuenta que recibe. */
  toAccountId: id.nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  /** Día del movimiento en Cancún. */
  date: isoDate,
  note: z.string().max(280),
  tags: z.array(z.string().min(1).max(30)).max(10),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Transaction = z.infer<typeof transactionSchema>;
