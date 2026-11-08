"use client";

import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { showToast } from "@/components/ui/toast";
import { formatDate, monthRange, todayInCancun } from "@/lib/dates";
import { formatPercent } from "@/lib/money";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { downloadBackup } from "@/modules/settings/backup-actions";
import { putRecurring, useAccounts, useBudgets, useCategories, useRecurring, useTransactions } from "./data";
import { budgetStatuses } from "./lib/budgets";
import { latestPublished, summarizePeriod } from "./lib/period-summary";
import { nextOccurrenceAfter, planRecurring } from "./lib/recurrence";
import { openTransactionSheet } from "./sheet-store";
import { TRANSACTION_TYPE_LABELS, type Recurring } from "./types";

const DAY = 86_400_000;

/** Lo que pide tu atención hoy. Si no hay nada, no se muestra. */
export function TodayPanel() {
  const transactions = useTransactions();
  const categories = useCategories();
  const budgets = useBudgets();
  const rules = useRecurring();
  const accounts = useAccounts();
  const seen = useSetting("summariesSeen");
  const lastBackup = useSetting("lastBackupAt");
  const snoozed = useSetting("backupReminderSnoozedUntil");
  const [now] = useState(() => new Date());

  if (!transactions || !categories || !budgets || !rules || !accounts || !seen || !lastBackup || !snoozed) return null;

  const today = todayInCancun(now);
  const names = new Map(categories.map((category) => [category.id, category.name]));

  // Resúmenes nuevos que no has abierto (solo si tuvieron movimientos).
  const ready: { kind: "semanal" | "mensual"; href: string; label: string }[] = [];
  const weekly = latestPublished("semanal", now);
  const monthly = latestPublished("mensual", now);
  if (
    seen.value?.weekly !== weekly.start &&
    summarizePeriod("semanal", weekly, transactions, categories, today).totals.count > 0
  ) {
    ready.push({ kind: "semanal", href: "/finanzas/resumenes", label: "Tu resumen semanal está listo" });
  }
  if (
    seen.value?.monthly !== monthly.start.slice(0, 7) &&
    summarizePeriod("mensual", monthly, transactions, categories, today).totals.count > 0
  ) {
    ready.push({ kind: "mensual", href: "/finanzas/resumenes#mensual", label: "Tu resumen mensual está listo" });
  }

  const pending = planRecurring(rules, accounts, today, now.getTime()).pending;
  const alerts = budgetStatuses(budgets, transactions, categories, monthRange(today)).filter(
    (status) => status.level !== "ok",
  );

  const daysSinceBackup = lastBackup.value ? Math.floor((now.getTime() - lastBackup.value) / DAY) : null;
  const needsBackup =
    transactions.length > 0 &&
    (daysSinceBackup === null || daysSinceBackup >= 7) &&
    (snoozed.value ?? 0) < now.getTime();

  if (ready.length === 0 && pending.length === 0 && alerts.length === 0 && !needsBackup) return null;

  async function skip(rule: Recurring, date: string) {
    await putRecurring({ ...rule, nextDate: nextOccurrenceAfter(rule, date) });
    showToast({ message: `Omitido el del ${formatDate(date)}`, action: { label: "Deshacer", run: () => putRecurring(rule) } });
  }

  return (
    <Panel title="Para hoy">
      <ul className="flex flex-col divide-y divide-borde">
        {ready.map((item) => (
          <li key={item.kind} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-interfaz">{item.label}</span>
            <Link href={item.href} className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
              Ver resumen
            </Link>
          </li>
        ))}

        {pending.map(({ rule, date }) => {
          const name =
            (rule.template.categoryId ? names.get(rule.template.categoryId) : undefined) ??
            (rule.template.note || TRANSACTION_TYPE_LABELS[rule.template.type]);
          return (
            <li key={rule.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
              <span className="flex items-baseline justify-between gap-3 text-interfaz">
                <span className="min-w-0">
                  Por confirmar: {name} <span className="text-etiqueta text-texto-2">del {formatDate(date)}</span>
                </span>
                <Amount cents={rule.template.amountCents} currency={rule.template.currency} />
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secundario"
                  onClick={() =>
                    openTransactionSheet({
                      kind: "nuevo",
                      preset: { ...rule.template, fxRate: rule.template.fxRate ?? undefined, date },
                      recurring: { id: rule.id, date },
                    })
                  }
                >
                  Registrar
                </Button>
                <Button variant="fantasma" onClick={() => void skip(rule, date)}>
                  Omitir
                </Button>
              </span>
            </li>
          );
        })}

        {alerts.map((status) => (
          <li key={status.categoryId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-interfaz">
              {status.level === "excedido" ? "Te pasaste del presupuesto de " : "Vas en el "}
              {status.level === "excedido" ? (
                names.get(status.categoryId)
              ) : (
                <>
                  <span className="cifras">{formatPercent(status.ratio, 0, "auto")}</span> del presupuesto de{" "}
                  {names.get(status.categoryId)}
                </>
              )}
            </span>
            <Link
              href="/finanzas/presupuestos"
              className={cn(
                "shrink-0 text-etiqueta font-medium underline-offset-4 hover:underline",
                status.level === "excedido" ? "text-negativo-texto" : "text-laton",
              )}
            >
              Ver
            </Link>
          </li>
        ))}

        {needsBackup ? (
          <li className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
            <span className="text-interfaz">
              {daysSinceBackup === null
                ? "Aún no descargas un respaldo. Tus datos solo viven en este dispositivo."
                : `Tu último respaldo fue hace ${daysSinceBackup} días.`}
            </span>
            <span className="flex gap-2">
              <Button variant="secundario" onClick={() => void downloadBackup()}>
                Descargar respaldo
              </Button>
              <Button
                variant="fantasma"
                onClick={() => void setSetting("backupReminderSnoozedUntil", now.getTime() + DAY)}
              >
                Mañana
              </Button>
            </span>
          </li>
        ) : null}
      </ul>
    </Panel>
  );
}
