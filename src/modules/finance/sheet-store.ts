"use client";

import { useSyncExternalStore } from "react";
import type { IsoDate } from "@/lib/dates";
import type { Frequency, Transaction, TransactionType } from "./types";

/** Abre la hoja de movimiento desde cualquier pantalla (botón +, historial, cuentas, recurrentes). */

/** Valores con los que se llena la hoja (de una plantilla o de un recurrente). */
export type MovementPreset = Partial<
  Pick<
    Transaction,
    | "type"
    | "amountCents"
    | "currency"
    | "fxRate"
    | "categoryId"
    | "accountId"
    | "toAccountId"
    | "paymentMethod"
    | "note"
    | "tags"
    | "date"
  >
>;

export type SheetRequest =
  | {
      kind: "nuevo";
      type?: TransactionType;
      accountId?: string;
      preset?: MovementPreset;
      /** Confirmación de un recurrente: al guardar, la regla pasa a su siguiente fecha. */
      recurring?: { id: string; date: IsoDate };
      /** Abre con "Repetir" ya elegido. */
      repeat?: Frequency;
      /** Abre con "Guardar también como plantilla" marcado. */
      asTemplate?: boolean;
    }
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
