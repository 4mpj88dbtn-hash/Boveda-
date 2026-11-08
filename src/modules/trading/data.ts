"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { setSetting, useSetting } from "@/lib/settings";
import { DEFAULT_TRADING_RULES, type ExitReason, type Trade, type TradeImage, type TradeReview, type TradingRules } from "./types";

/** Operaciones, capturas y revisiones guardadas en el dispositivo. */

export function useTrades(): Trade[] | undefined {
  return useLiveQuery(async () => (await getDb().trades.toArray()).sort((a, b) => b.openedAt - a.openedAt), []);
}

export function useTradeImage(tradeId: string | null): TradeImage | null | undefined {
  return useLiveQuery(async () => (tradeId ? ((await getDb().tradeImages.where("tradeId").equals(tradeId).first()) ?? null) : null), [tradeId]);
}

export function useTradeReview(weekStart: string): TradeReview | null | undefined {
  return useLiveQuery(async () => (await getDb().tradeReviews.get(weekStart)) ?? null, [weekStart]);
}

export async function putTrade(trade: Trade): Promise<void> {
  await getDb().trades.put(trade);
}

/**
 * Cierra una operación abierta a un precio y una hora. Si ya estaba cerrada (por ejemplo, la
 * cerró el stop mientras tanto), no la toca y devuelve null.
 */
export async function closeTrade(id: string, exitPrice: string, at: number, reason: ExitReason): Promise<Trade | null> {
  const db = getDb();
  return db.transaction("rw", db.trades, async () => {
    const current = await db.trades.get(id);
    if (!current || current.status !== "abierta") return null;
    const closed: Trade = {
      ...current,
      status: "cerrada",
      closedAt: Math.max(at, current.openedAt),
      exitPrice,
      exitReason: reason,
      updatedAt: Date.now(),
    };
    await db.trades.put(closed);
    return closed;
  });
}

/** Borra la operación con su captura. Devuelve lo borrado para poder deshacer. */
export async function deleteTrade(id: string): Promise<{ trade: Trade | undefined; images: TradeImage[] }> {
  const db = getDb();
  return db.transaction("rw", db.trades, db.tradeImages, async () => {
    const trade = await db.trades.get(id);
    const images = await db.tradeImages.where("tradeId").equals(id).toArray();
    await db.tradeImages.where("tradeId").equals(id).delete();
    await db.trades.delete(id);
    return { trade, images };
  });
}

export async function restoreTrade(trade: Trade, images: TradeImage[]): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.trades, db.tradeImages, async () => {
    await db.trades.put(trade);
    await db.tradeImages.bulkPut(images);
  });
}

/** Una sola captura por operación: reemplaza la anterior (o la quita con null). */
export async function setTradeImage(tradeId: string, image: Omit<TradeImage, "id" | "tradeId" | "createdAt"> | null): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.tradeImages, async () => {
    await db.tradeImages.where("tradeId").equals(tradeId).delete();
    if (image) await db.tradeImages.put({ id: crypto.randomUUID(), tradeId, ...image, createdAt: Date.now() });
  });
}

export async function putTradeReview(review: TradeReview): Promise<void> {
  await getDb().tradeReviews.put(review);
}

/** Reglas guardadas o las de inicio. `undefined` mientras carga. */
export function useTradingRules(): TradingRules | undefined {
  const saved = useSetting("tradingRules");
  if (!saved) return undefined;
  return saved.value ?? DEFAULT_TRADING_RULES;
}

export async function saveTradingRules(rules: TradingRules): Promise<void> {
  await setSetting("tradingRules", rules);
}
