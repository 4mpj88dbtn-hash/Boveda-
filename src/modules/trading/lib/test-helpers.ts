import { cancunInstant } from "@/lib/dates";
import type { Trade } from "../types";

/** Operación de prueba: largo de 100 títulos a $100 con stop en $98 (arriesga $200). */
export function makeTrade(overrides: Partial<Trade> = {}): Trade {
  const openedAt = overrides.openedAt ?? cancunInstant("2026-11-02", 10).getTime();
  const closed = overrides.exitPrice !== undefined && overrides.exitPrice !== null;
  return {
    id: overrides.id ?? `t-${Math.random().toString(36).slice(2)}`,
    account: "simulador",
    assetId: "aapl",
    symbol: "AAPL",
    currency: "USD",
    direction: "largo",
    strategy: "Ruptura",
    openedAt,
    entryPrice: "100",
    stopLoss: "98",
    target: "104",
    quantity: "100",
    feesCents: 0,
    status: closed ? "cerrada" : "abierta",
    closedAt: closed ? openedAt + 3_600_000 : null,
    exitPrice: null,
    exitReason: closed ? "manual" : null,
    emotion: "calma",
    followedPlan: null,
    checklistComplete: true,
    lesson: "",
    notes: "",
    createdAt: openedAt,
    updatedAt: openedAt,
    ...overrides,
  };
}
