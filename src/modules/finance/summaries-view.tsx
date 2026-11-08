"use client";

import { ChevronLeft, ChevronRight, FileDown, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { showToast } from "@/components/ui/toast";
import { addDaysToIsoDate, formatDate, todayInCancun } from "@/lib/dates";
import { formatPercent } from "@/lib/money";
import { buildPdf } from "@/lib/pdf";
import { saveFile } from "@/lib/save-file";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useAccounts, useBudgets, useCategories, useTransactions } from "./data";
import { netWorthAt } from "./lib/balances";
import { budgetStatuses, type BudgetStatus } from "./lib/budgets";
import {
  latestPublished,
  periodFor,
  publishedAt,
  shiftPeriod,
  summarizePeriod,
  type PeriodSummary,
  type SummaryKind,
} from "./lib/period-summary";
import { summaryFooter, summaryHeading, summaryRows, summaryText, type SummaryDocumentInput } from "./lib/summary-document";
import { MonthTotals } from "./overview";

const WEEKDAY = new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: "UTC" });
const weekday = (date: string) => WEEKDAY.format(new Date(`${date}T12:00:00Z`));

/** Pantalla "Resúmenes": el semanal (domingo 20:00) y el mensual (día 1, 9:00). */
export function SummariesView() {
  const transactions = useTransactions();
  const categories = useCategories();
  const budgets = useBudgets();
  const accounts = useAccounts();
  const usdRate = useSetting("usdMxnRate");
  const seen = useSetting("summariesSeen");
  const [now] = useState(() => new Date());
  // Desde el Centro de mando se puede llegar directo al mensual (#mensual).
  const [kind, setKind] = useState<SummaryKind>(() =>
    typeof window !== "undefined" && window.location.hash === "#mensual" ? "mensual" : "semanal",
  );
  const [offset, setOffset] = useState(0);

  const latest = latestPublished(kind, now);
  const current = periodFor(kind, todayInCancun(now));
  const maxOffset = current.start === latest.start ? 0 : 1;
  const range = shiftPeriod(kind, latest, offset);
  const inProgress = offset > 0;

  // Abrir el último resumen listo lo marca como visto.
  const seenValue = seen?.value;
  useEffect(() => {
    if (!seen || offset !== 0) return;
    const key = kind === "semanal" ? latest.start : latest.start.slice(0, 7);
    const previous = seenValue ?? { weekly: null, monthly: null };
    if ((kind === "semanal" ? previous.weekly : previous.monthly) === key) return;
    void setSetting("summariesSeen", kind === "semanal" ? { ...previous, weekly: key } : { ...previous, monthly: key });
  }, [seen, seenValue, kind, offset, latest.start]);

  if (!transactions || !categories || !budgets || !accounts || !usdRate) return null;

  const today = todayInCancun(now);
  const summary = summarizePeriod(kind, range, transactions, categories, today);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const categoryName = (id: string) => names.get(id) ?? "Sin categoría";
  const rate = usdRate.value?.rate ?? null;
  const monthly = kind === "mensual";
  const statuses = monthly ? budgetStatuses(budgets, transactions, categories, range) : [];
  const netWorthChangeCents = monthly
    ? netWorthAt(accounts, transactions, range.end, rate).totalCents -
      netWorthAt(accounts, transactions, addDaysToIsoDate(range.start, -1), rate).totalCents
    : null;
  const input: SummaryDocumentInput = {
    summary,
    categoryName,
    budgets: statuses,
    netWorthChangeCents,
    generatedAt: now,
  };
  const { subtitle } = summaryHeading(kind, range);
  const ready = publishedAt(kind, range);
  const readyDay = todayInCancun(ready);
  const readyText = kind === "semanal" ? `el domingo ${formatDate(readyDay)} a las 20:00` : `el ${formatDate(readyDay)} a las 9:00`;

  async function downloadPdf() {
    const bytes = buildPdf(summaryRows(input), summaryFooter(new Date()));
    const file = new File([bytes.slice().buffer], `boveda-resumen-${kind}-${range.start}.pdf`, { type: "application/pdf" });
    const result = await saveFile(file);
    if (result === "descargado") showToast({ message: "PDF descargado" });
  }

  async function share() {
    const text = summaryText(input);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: "Resumen copiado. Pégalo en Telegram o WhatsApp." });
    } catch {
      showToast({ message: "No se pudo copiar el resumen." });
    }
  }

  return (
    <>
      <div role="group" aria-label="Tipo de resumen" className="grid grid-cols-2 gap-1 rounded-full bg-superficie p-1 sm:max-w-sm">
        {(["semanal", "mensual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => {
              setKind(option);
              setOffset(0);
            }}
            className={cn(
              "h-11 rounded-full text-interfaz font-medium transition-colors duration-120 ease-boveda",
              kind === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
            )}
          >
            {option === "semanal" ? "Semanal" : "Mensual"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="fantasma" size="icono" aria-label="Periodo anterior" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-col items-center text-center">
          <h2 className="text-titulo lg:text-titulo-lg" aria-live="polite">
            {subtitle}
          </h2>
          <p className="text-etiqueta text-texto-2">
            {inProgress ? `En curso. Se cierra ${readyText}.` : `Listo desde ${readyText}.`}
          </p>
        </div>
        <Button
          variant="fantasma"
          size="icono"
          aria-label="Periodo siguiente"
          disabled={offset >= maxOffset}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight aria-hidden className="size-5" />
        </Button>
      </div>

      {summary.totals.count === 0 ? (
        <EmptyState
          title={kind === "semanal" ? "Sin movimientos en esta semana" : "Sin movimientos en este mes"}
          description="Cuando registres gastos e ingresos, aquí verás tus totales, en qué se fue tu dinero y cómo vas contra el periodo anterior."
        />
      ) : (
        <SummaryContent summary={summary} categoryName={categoryName} statuses={statuses} netWorthChangeCents={netWorthChangeCents} />
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void downloadPdf()} disabled={summary.totals.count === 0}>
          <FileDown aria-hidden className="size-5" />
          Descargar PDF
        </Button>
        <Button variant="secundario" onClick={() => void share()} disabled={summary.totals.count === 0}>
          <Share2 aria-hidden className="size-5" />
          Compartir
        </Button>
      </div>
      <p className="text-nota text-texto-2">
        Compartir abre el menú de tu celular para mandarlo por Telegram, WhatsApp o correo. Montos en pesos.
      </p>
    </>
  );
}

function SummaryContent({
  summary,
  categoryName,
  statuses,
  netWorthChangeCents,
}: {
  summary: PeriodSummary;
  categoryName: (id: string) => string;
  statuses: BudgetStatus[];
  netWorthChangeCents: number | null;
}) {
  const unit = summary.kind === "semanal" ? "semana" : "mes";
  const comparisons = [
    { label: `Gastos contra ${unit === "semana" ? "la semana anterior" : "el mes anterior"}`, value: summary.expenseChange },
    { label: `Ingresos contra ${unit === "semana" ? "la semana anterior" : "el mes anterior"}`, value: summary.incomeChange },
    { label: `Gastos contra el promedio de 4 ${unit === "semana" ? "semanas" : "meses"}`, value: summary.expenseVsAverage },
    ...(summary.kind === "mensual"
      ? [{ label: "Gastos contra el mismo mes del año pasado", value: summary.expenseVsLastYear }]
      : []),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <Panel title="Totales">
        <MonthTotals totals={summary.totals} />
      </Panel>

      <Panel title="Comparación">
        <dl className="flex flex-col divide-y divide-borde">
          {comparisons.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <dt className="text-interfaz text-texto-2">{item.label}</dt>
              <dd className="cifras shrink-0 text-interfaz">{item.value === null ? "Sin datos" : formatPercent(item.value, 1)}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="En qué se fue">
        {summary.topCategories.length === 0 ? (
          <p className="text-interfaz text-texto-2">Sin gastos en este periodo.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {summary.topCategories.map((item) => (
              <li key={item.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-interfaz">
                    {categoryName(item.categoryId)}{" "}
                    <span className="cifras text-texto-2">{formatPercent(item.share, 0, "auto")}</span>
                  </span>
                  <Amount cents={item.cents} className="text-interfaz" />
                </div>
                <div className="h-1.5 rounded-full bg-elevada" aria-hidden>
                  <div className="h-full rounded-full bg-laton" style={{ width: `${Math.max(2, item.share * 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Por día">
        <dl className="flex flex-col divide-y divide-borde">
          <div className="flex items-baseline justify-between gap-3 pb-2">
            <dt className="text-interfaz text-texto-2">Gasto diario promedio ({summary.days} días)</dt>
            <dd className="font-serif text-cifra font-semibold">
              <Amount cents={summary.dailyAverageCents} />
            </dd>
          </div>
          {summary.maxDay ? (
            <div className="flex items-baseline justify-between gap-3 pt-2">
              <dt className="text-interfaz text-texto-2">
                Día de mayor gasto: {weekday(summary.maxDay.date)} {formatDate(summary.maxDay.date)}
              </dt>
              <dd className="font-serif text-cifra font-semibold">
                <Amount cents={summary.maxDay.cents} />
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      {summary.kind === "mensual" ? (
        <Panel title="Presupuestos y patrimonio">
          {statuses.length === 0 ? (
            <p className="text-interfaz text-texto-2">Sin presupuestos. Agrégalos en Finanzas → Presupuestos.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {statuses.map((status) => (
                <li key={status.categoryId} className="flex items-baseline justify-between gap-3 text-interfaz">
                  <span className="truncate">
                    {categoryName(status.categoryId)}{" "}
                    <span className={cn("cifras", status.level === "excedido" ? "text-negativo-texto" : "text-texto-2")}>
                      {formatPercent(status.ratio, 0, "auto")}
                    </span>
                  </span>
                  <span className="cifras shrink-0 text-texto-2">
                    <Amount cents={status.spentCents} className="text-texto" /> de <Amount cents={status.limitCents} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {netWorthChangeCents !== null ? (
            <p className="flex items-baseline justify-between gap-3 border-t border-borde pt-3 text-interfaz">
              <span className="text-texto-2">Cambio del patrimonio neto en el mes</span>
              <Amount cents={netWorthChangeCents} tone="variacion" />
            </p>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
