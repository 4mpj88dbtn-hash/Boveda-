"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { Dividend, Purchase } from "./lib/portfolio";

/** Compras y dividendos guardados en el dispositivo. */

export function usePurchases(): Purchase[] | undefined {
  return useLiveQuery(async () => (await getDb().purchases.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), []);
}

export function useDividends(): Dividend[] | undefined {
  return useLiveQuery(async () => (await getDb().dividends.toArray()).sort((a, b) => b.date.localeCompare(a.date)), []);
}

export async function putPurchase(purchase: Purchase): Promise<void> {
  await getDb().purchases.put(purchase);
}

export async function deletePurchase(id: string): Promise<void> {
  await getDb().purchases.delete(id);
}

export async function putDividend(dividend: Dividend): Promise<void> {
  await getDb().dividends.put(dividend);
}

export async function deleteDividend(id: string): Promise<void> {
  await getDb().dividends.delete(id);
}

/** ETFs que se pueden registrar en el portafolio (los del catálogo con precio en USD). */
export const PORTFOLIO_ASSETS = ["voo", "ivv", "spy", "qqq", "vti", "vt", "vxus", "schd", "bnd", "gld"];
