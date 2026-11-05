"use client";

import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatDate, monthRange, todayInCancun } from "@/lib/dates";
import { formatPercent } from "@/lib/money";
import { useSetting } from "@/lib/settings";
import { CommandHeader } from "@/modules/command-center/command-header";
import { useAccounts, useTransactions } from "./data";
import { accountBalances, netWorth } from "./lib/balances";
import { periodTotals, type PeriodTotals } from "./lib/summary";

/** Patrimonio neto del Centro de mando, con lo que tienes registrado. */
export function NetWorthHeader() {
  const accounts = useAccounts();
  const transactions = useTransactions();
  const usdRate = useSetting("usdMxnRate");
  if (!accounts || !transactions || !usdRate) return <CommandHeader netWorthCents={null} />;

  const rate = usdRate.value ?? null;
  const worth = netWorth(accounts, accountBalances(accounts, transactions), rate?.rate ?? null);
  const month = periodTotals(transactions, monthRange(todayInCancun()));
  const empty = transactions.length === 0 && accounts.every((account) => account.openingBalanceCents === 0);
  const hasUsd = accounts.some((account) => account.currency === "USD");

  let note: string | undefined;
  if (empty) {
    note =
      "Registra tu primer gasto o ingreso con el botón +. Agrega tus bancos y tarjetas en Finanzas → Cuentas para ver aquí lo que tienes menos lo que debes.";
  } else if (worth.missingRate) {
    note = "No incluye tus cuentas en dólares: escribe el tipo de cambio en Finanzas → Cuentas.";
  } else if (hasUsd && rate) {
    note = `Tus cuentas en dólares, a $${rate.rate} por dólar (el que escribiste el ${formatDate(rate.date)}).`;
  }

  return (
    <CommandHeader
      netWorthCents={worth.totalCents}
      monthChangeCents={empty ? undefined : month.balanceCents}
      note={note}
    />
  );
}

/** Ingresos, gastos y balance del mes, en pesos. */
export function MonthTotals({ totals }: { totals: PeriodTotals }) {
  const rows = [
    { label: "Ingresos", cents: totals.incomeCents, tone: "neutro" as const },
    { label: "Gastos", cents: totals.expenseCents, tone: "neutro" as const },
    { label: "Balance", cents: totals.balanceCents, tone: "variacion" as const },
  ];
  return (
    <dl className="flex flex-col divide-y divide-borde">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <dt className="text-interfaz text-texto-2">{row.label}</dt>
          <dd className="font-serif text-cifra font-semibold">
            <Amount cents={row.cents} tone={totals.count === 0 ? "apagado" : row.tone} />
          </dd>
        </div>
      ))}
      {totals.savingsRate !== null ? (
        <div className="flex items-baseline justify-between gap-3 pt-2">
          <dt className="text-interfaz text-texto-2">Tasa de ahorro</dt>
          <dd className="cifras text-interfaz">{formatPercent(totals.savingsRate, 1, "auto")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function MonthPanel() {
  const transactions = useTransactions();
  const totals = transactions ? periodTotals(transactions, monthRange(todayInCancun())) : null;

  return (
    <Panel
      title="Este mes"
      action={
        <Link href="/finanzas" className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
          Ver movimientos
        </Link>
      }
    >
      {totals ? <MonthTotals totals={totals} /> : null}
      {totals && totals.count === 0 ? (
        <EmptyState
          title="Sin movimientos este mes"
          description="Toca + para registrar un gasto: escribe el monto, elige la categoría y guarda."
        />
      ) : null}
    </Panel>
  );
}
