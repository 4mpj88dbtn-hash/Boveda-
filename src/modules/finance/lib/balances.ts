import { convertCents, type Currency } from "@/lib/money";
import type { Account, Transaction } from "../types";

/**
 * Saldos de las cuentas y patrimonio neto. Todo en centavos enteros; las conversiones de
 * moneda usan el tipo de cambio guardado en cada movimiento y redondean al centavo una vez.
 */

type Amounted = Pick<Transaction, "amountCents" | "currency" | "fxRate">;

/** El monto del movimiento en la moneda indicada, con el tipo de cambio del propio movimiento. */
export function amountIn(transaction: Amounted, currency: Currency): number {
  if (transaction.currency === currency) return transaction.amountCents;
  if (transaction.fxRate === null) throw new RangeError("Al movimiento le falta su tipo de cambio.");
  return convertCents(transaction.amountCents, transaction.currency, currency, transaction.fxRate);
}

/** El monto en pesos, para resúmenes y presupuestos. */
export function amountInMxn(transaction: Amounted): number {
  return amountIn(transaction, "MXN");
}

type Movement = Amounted & Pick<Transaction, "type" | "accountId" | "toAccountId">;

/** Cuánto cambia el saldo de una cuenta por un movimiento, en la moneda de la cuenta. */
export function accountDelta(transaction: Movement, account: Pick<Account, "id" | "currency">): number {
  let delta = 0;
  if (transaction.accountId === account.id) {
    const amount = amountIn(transaction, account.currency);
    delta += transaction.type === "ingreso" ? amount : -amount;
  }
  if (transaction.type === "transferencia" && transaction.toAccountId === account.id) {
    delta += amountIn(transaction, account.currency);
  }
  return delta;
}

/** Saldo de cada cuenta: saldo inicial más ingresos, menos gastos, más o menos transferencias. */
export function accountBalances(accounts: Account[], transactions: Movement[]): Map<string, number> {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const balances = new Map(accounts.map((account) => [account.id, account.openingBalanceCents]));
  for (const transaction of transactions) {
    const touched = new Set([transaction.accountId, transaction.toAccountId]);
    for (const accountId of touched) {
      const account = accountId === null ? undefined : byId.get(accountId);
      if (!account) continue;
      balances.set(account.id, (balances.get(account.id) ?? 0) + accountDelta(transaction, account));
    }
  }
  return balances;
}

export type NetWorth = {
  /** Lo que tienes menos lo que debes, en pesos. */
  totalCents: number;
  assetsCents: number;
  liabilitiesCents: number;
  /** Hay cuentas en USD y no hay tipo de cambio guardado: no se sumaron. */
  missingRate: boolean;
};

/**
 * Patrimonio neto en pesos. Las cuentas en USD se convierten con `usdRate` (pesos por
 * 1 dólar); sin él, se dejan fuera y se avisa. Las cuentas archivadas también cuentan.
 */
export function netWorth(accounts: Account[], balances: Map<string, number>, usdRate: string | null): NetWorth {
  const result: NetWorth = { totalCents: 0, assetsCents: 0, liabilitiesCents: 0, missingRate: false };
  for (const account of accounts) {
    const balance = balances.get(account.id) ?? account.openingBalanceCents;
    if (account.currency === "USD" && usdRate === null) {
      if (balance !== 0) result.missingRate = true;
      continue;
    }
    const mxn = account.currency === "MXN" ? balance : convertCents(balance, "USD", "MXN", usdRate ?? "0");
    result.totalCents += mxn;
    if (mxn >= 0) result.assetsCents += mxn;
    else result.liabilitiesCents -= mxn;
  }
  return result;
}

/** Patrimonio neto al cierre de un día: cuenta solo los movimientos hasta esa fecha. */
export function netWorthAt(
  accounts: Account[],
  transactions: (Movement & Pick<Transaction, "date">)[],
  date: string,
  usdRate: string | null,
): NetWorth {
  const until = transactions.filter((transaction) => transaction.date <= date);
  return netWorth(accounts, accountBalances(accounts, until), usdRate);
}

/**
 * Patrimonio al cierre de cada mes ("aaaa-mm"). Los saldos iniciales cuentan desde siempre y
 * las cuentas en dólares usan el tipo de cambio de hoy, así que la gráfica muestra cómo se
 * movió tu dinero por tus movimientos, no por el tipo de cambio.
 */
export function monthlyNetWorth(
  accounts: Account[],
  transactions: (Movement & Pick<Transaction, "date">)[],
  usdRate: string | null,
  months: string[],
): { month: string; cents: number }[] {
  return months.map((month) => {
    const [year = 0, monthNumber = 1] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return { month, cents: netWorthAt(accounts, transactions, `${month}-${String(lastDay).padStart(2, "0")}`, usdRate).totalCents };
  });
}
