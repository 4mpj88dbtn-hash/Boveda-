"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { Account, Attachment, Budget, Category, Recurring, Template, Transaction } from "./types";

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

/* ---------- Fase 1, parte 2 ---------- */

export function useBudgets(): Budget[] | undefined {
  return useLiveQuery(() => getDb().budgets.toArray(), []);
}

export function useRecurring(): Recurring[] | undefined {
  return useLiveQuery(() => getDb().recurring.orderBy("nextDate").toArray(), []);
}

export function useTemplates(): Template[] | undefined {
  return useLiveQuery(() => getDb().templates.orderBy("order").toArray(), []);
}

export function useAttachments(transactionId: string | null): Attachment[] | undefined {
  return useLiveQuery(
    async () => (transactionId ? getDb().attachments.where("transactionId").equals(transactionId).toArray() : []),
    [transactionId],
  );
}

export async function putBudget(budget: Budget): Promise<void> {
  await getDb().budgets.put(budget);
}

export async function deleteBudget(categoryId: string): Promise<void> {
  await getDb().budgets.delete(categoryId);
}

export async function putRecurring(rule: Recurring): Promise<void> {
  await getDb().recurring.put(rule);
}

export async function deleteRecurring(id: string): Promise<void> {
  await getDb().recurring.delete(id);
}

export async function putTemplate(template: Template): Promise<void> {
  await getDb().templates.put(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await getDb().templates.delete(id);
}

/** Cambia la foto del ticket de un movimiento (null = quitarla). */
export async function replaceAttachment(transactionId: string, attachment: Attachment | null): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.attachments, async () => {
    await db.attachments.where("transactionId").equals(transactionId).delete();
    if (attachment) await db.attachments.put(attachment);
  });
}

/** Elimina un movimiento con su foto y devuelve cómo deshacerlo. */
export async function removeTransaction(transaction: Transaction): Promise<() => Promise<void>> {
  const db = getDb();
  const attachments = await db.attachments.where("transactionId").equals(transaction.id).toArray();
  await db.transaction("rw", db.transactions, db.attachments, async () => {
    await db.transactions.delete(transaction.id);
    await db.attachments.where("transactionId").equals(transaction.id).delete();
  });
  return async () => {
    await db.transaction("rw", db.transactions, db.attachments, async () => {
      await db.transactions.put(transaction);
      await db.attachments.bulkPut(attachments);
    });
  };
}
