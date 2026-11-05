import { formatDate, formatMonth, inCancun, type IsoDate } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import type { PdfRow } from "@/lib/pdf";
import type { BudgetStatus } from "./budgets";
import type { PeriodSummary, SummaryKind } from "./period-summary";
import type { DateRange } from "./summary";

/** Textos del resumen, para el PDF y para compartirlo (Telegram, WhatsApp, correo). */

export type SummaryDocumentInput = {
  summary: PeriodSummary;
  categoryName: (id: string) => string;
  /** Solo mensual. */
  budgets?: BudgetStatus[];
  /** Solo mensual: cambio del patrimonio neto en el mes. */
  netWorthChangeCents?: number | null;
  generatedAt: Date;
};

const WEEKDAY = new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: "UTC" });

function weekday(date: IsoDate): string {
  return WEEKDAY.format(new Date(`${date}T12:00:00Z`));
}

export function summaryHeading(kind: SummaryKind, range: DateRange): { title: string; subtitle: string } {
  if (kind === "semanal") {
    return {
      title: "Resumen semanal",
      subtitle: `Del lunes ${formatDate(range.start)} al domingo ${formatDate(range.end)}`,
    };
  }
  const month = formatMonth(range.start.slice(0, 7));
  return { title: "Resumen mensual", subtitle: month.charAt(0).toUpperCase() + month.slice(1) };
}

const money = (cents: number) => formatMoney(cents, "MXN");
const change = (ratio: number | null) => (ratio === null ? "sin datos para comparar" : formatPercent(ratio, 1));

function previousLabel(kind: SummaryKind): string {
  return kind === "semanal" ? "la semana anterior" : "el mes anterior";
}

export function summaryRows(input: SummaryDocumentInput): PdfRow[] {
  const { summary, categoryName } = input;
  const { title, subtitle } = summaryHeading(summary.kind, summary.range);
  const rows: PdfRow[] = [
    { kind: "title", text: title },
    { kind: "subtitle", text: subtitle },
    { kind: "heading", text: "Totales" },
    { kind: "row", label: "Ingresos", value: money(summary.totals.incomeCents) },
    { kind: "row", label: "Gastos", value: money(summary.totals.expenseCents) },
    { kind: "row", label: "Balance", value: formatMoney(summary.totals.balanceCents, "MXN", { signDisplay: "exceptZero" }), strong: true },
  ];
  if (summary.totals.savingsRate !== null) {
    rows.push({ kind: "row", label: "Tasa de ahorro", value: formatPercent(summary.totals.savingsRate, 1, "auto") });
  }

  rows.push(
    { kind: "heading", text: "Comparación" },
    { kind: "row", label: `Gastos contra ${previousLabel(summary.kind)}`, value: change(summary.expenseChange) },
    { kind: "row", label: `Ingresos contra ${previousLabel(summary.kind)}`, value: change(summary.incomeChange) },
    {
      kind: "row",
      label: `Gastos contra el promedio de 4 ${summary.kind === "semanal" ? "semanas" : "meses"}`,
      value: change(summary.expenseVsAverage),
    },
  );
  if (summary.kind === "mensual") {
    rows.push({ kind: "row", label: "Gastos contra el mismo mes del año pasado", value: change(summary.expenseVsLastYear) });
  }

  if (summary.topCategories.length > 0) {
    rows.push({ kind: "heading", text: "En qué se fue" });
    for (const item of summary.topCategories) {
      rows.push({
        kind: "row",
        label: `${categoryName(item.categoryId)} (${formatPercent(item.share, 0, "auto")})`,
        value: money(item.cents),
      });
    }
  }

  rows.push(
    { kind: "heading", text: "Por día" },
    { kind: "row", label: "Gasto diario promedio", value: money(summary.dailyAverageCents) },
  );
  if (summary.maxDay) {
    rows.push({
      kind: "row",
      label: `Día de mayor gasto: ${weekday(summary.maxDay.date)} ${formatDate(summary.maxDay.date)}`,
      value: money(summary.maxDay.cents),
    });
  }

  if (input.budgets && input.budgets.length > 0) {
    rows.push({ kind: "heading", text: "Presupuestos" });
    for (const budget of input.budgets) {
      rows.push({
        kind: "row",
        label: `${categoryName(budget.categoryId)}: ${formatPercent(budget.ratio, 0, "auto")}`,
        value: `${money(budget.spentCents)} de ${money(budget.limitCents)}`,
      });
    }
  }

  if (input.netWorthChangeCents !== undefined && input.netWorthChangeCents !== null) {
    rows.push(
      { kind: "heading", text: "Patrimonio neto" },
      {
        kind: "row",
        label: "Cambio en el mes",
        value: formatMoney(input.netWorthChangeCents, "MXN", { signDisplay: "exceptZero" }),
      },
    );
  }

  rows.push(
    { kind: "space" },
    { kind: "rule" },
    {
      kind: "text",
      text: "Montos en pesos. Los movimientos en dólares usan el tipo de cambio con el que los registraste. Las transferencias entre tus cuentas no cuentan como gasto ni ingreso.",
    },
  );
  return rows;
}

/** Pie del PDF con la fecha y hora de Cancún. */
export function summaryFooter(generatedAt: Date): string {
  const time = inCancun(generatedAt);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const day = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;
  return `Bóveda · generado el ${formatDate(day)} a las ${hh}:${mm} (hora de Cancún)`;
}

/** Versión en texto para mandar por mensaje. */
export function summaryText(input: SummaryDocumentInput): string {
  const { summary, categoryName } = input;
  const { title, subtitle } = summaryHeading(summary.kind, summary.range);
  const lines = [
    `${title} · ${subtitle}`,
    `Ingresos: ${money(summary.totals.incomeCents)}`,
    `Gastos: ${money(summary.totals.expenseCents)}${summary.expenseChange === null ? "" : ` (${formatPercent(summary.expenseChange, 1)} contra ${previousLabel(summary.kind)})`}`,
    `Balance: ${formatMoney(summary.totals.balanceCents, "MXN", { signDisplay: "exceptZero" })}`,
  ];
  if (summary.totals.savingsRate !== null) lines.push(`Tasa de ahorro: ${formatPercent(summary.totals.savingsRate, 1, "auto")}`);
  if (summary.topCategories.length > 0) {
    lines.push(`En qué se fue: ${summary.topCategories.map((item) => `${categoryName(item.categoryId)} ${money(item.cents)}`).join(", ")}`);
  }
  lines.push(`Gasto diario promedio: ${money(summary.dailyAverageCents)}`);
  if (summary.maxDay) {
    lines.push(`Día de mayor gasto: ${weekday(summary.maxDay.date)} ${formatDate(summary.maxDay.date)} (${money(summary.maxDay.cents)})`);
  }
  return lines.join("\n").replace(/ /g, " ");
}
