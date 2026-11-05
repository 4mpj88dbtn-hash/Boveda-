"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { Account, Category, Transaction } from "./types";

/**
 * Lectura y escritura de Finanzas en el dispositivo. Los hooks devuelven `undefined`
 * mientras cargan y se actualizan solos cuando algo cambia.
 */

export function useAccounts(): Account[] | undefined {
  return useLiveQuery(() => getDb().accounts.orderBy("order").toArray(), []);
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => getDb().categories.orderBy("order").toArray(), []);
}

/** Todos los movimientos, del más reciente al más antiguo. */
export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(async () => {
    const rows = await getDb().transactions.toArray();
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, []);
}

/** El último movimiento registrado, o `null` si no hay. */
export function useLastTransaction(): Transaction | null | undefined {
  return useLiveQuery(async () => (await getDb().transactions.orderBy("createdAt").last()) ?? null, []);
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  await getDb().transactions.put(transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
  await getDb().transactions.delete(id);
}

export async function putAccount(account: Account): Promise<void> {
  await getDb().accounts.put(account);
}

export async function putCategory(category: Category): Promise<void> {
  await getDb().categories.put(category);
}

/** El siguiente número de orden para poner algo al final de su lista. */
export function nextOrder(items: { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}
