"use client";

import { useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import { todayInCancun } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { planRecurring } from "./lib/recurrence";

/** Registra los movimientos recurrentes automáticos que ya tocan. Devuelve cuántos registró. */
export async function runRecurring(now = new Date()): Promise<number> {
  const db = getDb();
  return db.transaction("rw", db.recurring, db.accounts, db.transactions, async () => {
    const [rules, accounts] = await Promise.all([db.recurring.toArray(), db.accounts.toArray()]);
    const plan = planRecurring(rules, accounts, todayInCancun(now), now.getTime());
    // El id fijo por fecha evita duplicados si la app se abre en dos pestañas a la vez.
    const existing = new Set(
      (await db.transactions.bulkGet(plan.create.map((transaction) => transaction.id)))
        .filter((row) => row !== undefined)
        .map((row) => row.id),
    );
    const fresh = plan.create.filter((transaction) => !existing.has(transaction.id));
    await db.transactions.bulkPut(fresh);
    for (const { id, nextDate } of plan.advance) await db.recurring.update(id, { nextDate });
    return fresh.length;
  });
}

/** Revisa los recurrentes al abrir la app, al volver a ella y una vez por minuto. */
export function RecurringRunner() {
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const created = await runRecurring();
        if (!cancelled && created > 0) {
          showToast({
            message:
              created === 1 ? "Se registró 1 movimiento recurrente" : `Se registraron ${created} movimientos recurrentes`,
          });
        }
      } catch {
        // Si falla, se intenta de nuevo en el siguiente minuto; lo demás de la app sigue igual.
      }
    }
    void run();
    const timer = setInterval(() => void run(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
