"use client";

import { useSyncExternalStore } from "react";
import type { Transaction, TransactionType } from "./types";

/** Abre la hoja de movimiento desde cualquier pantalla (botón +, historial, cuentas). */

export type SheetRequest =
  | { kind: "nuevo"; type?: TransactionType; accountId?: string }
  | { kind: "editar"; transaction: Transaction };

type OpenSheet = SheetRequest & { key: number };

let current: OpenSheet | null = null;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openTransactionSheet(request: SheetRequest): void {
  counter += 1;
  current = { ...request, key: counter };
  emit();
}

export function closeTransactionSheet(): void {
  if (current === null) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTransactionSheet(): OpenSheet | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
