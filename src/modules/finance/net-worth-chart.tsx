"use client";

import { formatMonth, todayInCancun } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Panel } from "@/components/ui/panel";
import { monthlyNetWorth } from "./lib/balances";
import type { Account, Transaction } from "./types";

const SHORT_MONTH = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });

/** Meses desde el primer dato hasta el actual, como máximo los últimos 12. */
export function chartMonths(accounts: Account[], transactions: Transaction[], today: string): string[] {
  const firsts = [
    ...transactions.map((transaction) => transaction.date.slice(0, 7)),
    ...accounts.map((account) => todayInCancun(new Date(account.createdAt)).slice(0, 7)),
  ].sort();
  const current = today.slice(0, 7);
  const start = firsts[0] && firsts[0] < current ? firsts[0] : current;
  const months: string[] = [];
  let [year = 0, month = 1] = start.split("-").map(Number);
  while (`${year}-${String(month).padStart(2, "0")}` <= current) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months.slice(-12);
}

/** Gráfica de línea del patrimonio neto al cierre de cada mes. */
export function NetWorthChart({
  accounts,
  transactions,
  usdRate,
}: {
  accounts: Account[];
  transactions: Transaction[];
  usdRate: string | null;
}) {
  const months = chartMonths(accounts, transactions, todayInCancun());
  const points = monthlyNetWorth(accounts, transactions, usdRate, months);

  return (
    <Panel title="Evolución mensual">
      {points.length < 2 ? (
        <p className="text-interfaz text-texto-2">
          La gráfica aparece cuando tengas datos de dos meses. Muestra tu patrimonio al cierre de cada mes.
        </p>
      ) : (
        <Chart points={points} />
      )}
    </Panel>
  );
}

function Chart({ points }: { points: { month: string; cents: number }[] }) {
  const width = 640;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const values = points.map((point) => point.cents);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 100;
    max += 100;
  }
  const x = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / (points.length - 1);
  const y = (cents: number) => pad.top + ((max - cents) * (height - pad.top - pad.bottom)) / (max - min);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.cents).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${height - pad.bottom} L${x(0).toFixed(1)},${height - pad.bottom} Z`;
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;
  const label = (month: string) => SHORT_MONTH.format(new Date(`${month}-15T12:00:00Z`)).replace(".", "");

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-etiqueta text-texto-2">
        De {formatMoney(first.cents, "MXN")} en {formatMonth(first.month)} a {formatMoney(last.cents, "MXN")} en{" "}
        {formatMonth(last.month)}.
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Patrimonio neto por mes">
        <path d={area} className="fill-laton/10" />
        <path d={line} className="fill-none stroke-laton" strokeWidth={2} strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={point.month} cx={x(index)} cy={y(point.cents)} r={3} className="fill-laton" />
        ))}
        {points.map((point, index) =>
          index === 0 || index === points.length - 1 || points.length <= 6 || index % 2 === 0 ? (
            <text
              key={point.month}
              x={x(index)}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="fill-texto-2 text-[11px]"
            >
              {label(point.month)}
            </text>
          ) : null,
        )}
      </svg>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-etiqueta text-texto-2 hover:text-texto">
          Ver cifras
        </summary>
        <table className="w-full text-etiqueta">
          <tbody>
            {points.map((point) => (
              <tr key={point.month} className="border-t border-borde">
                <td className="py-1.5 first-letter:uppercase">{formatMonth(point.month)}</td>
                <td className="cifras py-1.5 text-right">{formatMoney(point.cents, "MXN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
