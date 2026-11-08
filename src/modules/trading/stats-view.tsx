"use client";

import Big from "big.js";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { LineChart } from "@/components/ui/line-chart";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { todayInCancun, weekRange } from "@/lib/dates";
import { formatMoney, formatPercent, roundHalfUp, type Currency } from "@/lib/money";
import { useTrades, useTradingRules } from "./data";
import { formatRatio } from "./lib/calculators";
import { journalStats, outcomes, type Group } from "./lib/stats";
import { AccountSwitch, formatR, Stat, useNow } from "./trading-ui";
import type { Trade, TradeAccount } from "./types";

const DAY_MS = 86_400_000;
const money = (cents: number, currency: Currency, sign = false) =>
  formatMoney(roundHalfUp(new Big(cents)), currency, { signDisplay: sign ? "exceptZero" : "auto" });
const decimal = (value: number, digits = 2) => value.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Estadísticas automáticas del diario (§5.2). */
export function StatsView() {
  const trades = useTrades();
  const rules = useTradingRules();
  const now = useNow();
  const [account, setAccount] = useState<TradeAccount>("simulador");

  if (!trades || !rules || !now) return null;
  const currency: Currency = account === "simulador" ? "USD" : rules.realCurrency;
  const all = trades.filter((trade) => trade.account === account);
  const list = all.filter((trade) => trade.currency === currency);
  const otherCurrency = all.length - list.length;
  const starting = account === "simulador" ? rules.simCapitalCents : rules.realCapitalCents;
  const stats = journalStats(list, starting);
  const counts = {
    simulador: trades.filter((trade) => trade.account === "simulador" && trade.status === "cerrada").length,
    real: trades.filter((trade) => trade.account === "real" && trade.status === "cerrada").length,
  };

  return (
    <>
      <AccountSwitch value={account} onChange={setAccount} counts={counts} />
      {otherCurrency > 0 ? (
        <p className="text-etiqueta text-texto-2">
          {otherCurrency} {otherCurrency === 1 ? "operación está" : "operaciones están"} en otra moneda y no se incluyen.
        </p>
      ) : null}

      {stats.count === 0 ? (
        <Panel>
          <EmptyState
            title="Sin operaciones cerradas"
            description="Las estadísticas aparecen al cerrar tu primera operación: aciertos, riesgo/beneficio, esperanza, drawdown y tu curva de capital."
          />
        </Panel>
      ) : (
        <>
          {account === "simulador" ? <PracticeProgress trades={list} now={now} /> : null}

          <Panel title="Resumen">
            <dl className="grid gap-x-8 divide-y divide-borde sm:grid-cols-2 sm:divide-y-0">
              <Stat label="Operaciones cerradas" hint={`${stats.wins} ganadoras, ${stats.losses} perdedoras${stats.breakeven ? `, ${stats.breakeven} en cero` : ""}`}>
                {stats.count}
              </Stat>
              <Stat label="Aciertos">{stats.winRate === null ? "—" : formatPercent(stats.winRate, 1, "auto")}</Stat>
              <Stat label="Resultado neto">
                <Amount cents={stats.netCents} currency={currency} tone="variacion" />
              </Stat>
              <Stat label="Ganancia promedio">{stats.averageWinCents === null ? "—" : money(stats.averageWinCents, currency)}</Stat>
              <Stat label="Pérdida promedio">{stats.averageLossCents === null ? "—" : money(-stats.averageLossCents, currency)}</Stat>
              <Stat label="Riesgo/beneficio real" hint="Pérdida promedio contra ganancia promedio">
                {stats.payoff === null ? "—" : formatRatio(stats.payoff)}
              </Stat>
              <Stat label="Esperanza por operación" hint="Lo que esperas ganar en promedio por operación">
                {stats.expectancyCents === null ? "—" : money(stats.expectancyCents, currency, true)}
                {stats.averageR !== null ? <span className="block text-nota text-texto-2">{formatR(stats.averageR)}</span> : null}
              </Stat>
              <Stat label="Factor de beneficio" hint="Arriba de 1, ganas más de lo que pierdes">
                {stats.profitFactor === null ? (stats.grossProfitCents > 0 ? "Sin pérdidas" : "—") : decimal(stats.profitFactor)}
              </Stat>
              <Stat label="Racha ganadora más larga">{stats.longestWinStreak}</Stat>
              <Stat label="Racha perdedora más larga">{stats.longestLossStreak}</Stat>
              <Stat label="Racha actual">
                {stats.currentStreak ? `${stats.currentStreak.length} ${stats.currentStreak.kind}${stats.currentStreak.length === 1 ? "" : "s"}` : "—"}
              </Stat>
              <Stat label="Drawdown máximo" hint="La mayor caída desde un máximo de tu capital">
                {stats.drawdown === null
                  ? "—"
                  : stats.drawdown.ratio === null
                    ? `−${formatMoney(stats.drawdown.amountCents, currency)}`
                    : `${formatPercent(-stats.drawdown.ratio, 1)} (−${formatMoney(stats.drawdown.amountCents, currency)})`}
              </Stat>
            </dl>
          </Panel>

          <Panel title="Curva de capital">
            <LineChart
              ariaLabel="Capital después de cada operación cerrada"
              includeZero={false}
              labels={stats.equity.map((point, index) => (index === 0 ? "Inicio" : `#${index}`))}
              series={[{ label: starting ? "Capital" : "Resultado acumulado", color: "laton", values: stats.equity.map((point) => point.cents / 100) }]}
              format={(value) => formatMoney(roundHalfUp(new Big(value).times(100)), currency)}
            />
            {!starting && account === "real" ? <p className="text-nota text-texto-2">Escribe tu capital real en Plan → Reglas para ver la curva y el drawdown en porcentaje.</p> : null}
          </Panel>

          <GroupPanel title="Por estrategia" groups={stats.byStrategy} currency={currency} />
          <GroupPanel title="Por día de la semana" groups={stats.byWeekday} currency={currency} note="Día en que entraste (hora de Cancún)." />
          <GroupPanel title="Por hora de entrada" groups={stats.byHour} currency={currency} note="Hora de Cancún." />
          <GroupPanel title="Por emoción" groups={stats.byEmotion} currency={currency} />
          <GroupPanel title="¿Seguiste tu plan?" groups={stats.byPlan} currency={currency} note="Compara tus resultados cuando sigues tu plan y cuando no." />
        </>
      )}
      <EducationalNotice />
    </>
  );
}

function GroupPanel({ title, groups, currency, note }: { title: string; groups: Group[]; currency: Currency; note?: string }) {
  if (groups.length === 0) return null;
  return (
    <Panel title={title}>
      <table className="w-full text-interfaz">
        <thead>
          <tr className="text-left text-etiqueta text-texto-2">
            <th scope="col" className="py-1 font-medium">
              {title.replace(/^Por /, "").replace(/^¿Seguiste tu plan\?$/, "Plan")}
            </th>
            <th scope="col" className="py-1 text-right font-medium">Operaciones</th>
            <th scope="col" className="py-1 text-right font-medium">Aciertos</th>
            <th scope="col" className="py-1 text-right font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {groups.map((group) => (
            <tr key={group.key}>
              <th scope="row" className="max-w-[12rem] truncate py-2 text-left font-normal">
                {group.label}
              </th>
              <td className="cifras py-2 text-right">{group.count}</td>
              <td className="cifras py-2 text-right">{formatPercent(group.winRate, 0, "auto")}</td>
              <td className="py-2 text-right">
                <Amount cents={group.netCents} currency={currency} tone="variacion" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="text-nota text-texto-2">{note}</p> : null}
    </Panel>
  );
}

/** Cuánto llevas practicando: se sugieren 2–3 meses con resultados consistentes (§5.1). */
function PracticeProgress({ trades, now }: { trades: Trade[]; now: Date }) {
  const first = Math.min(...trades.map((trade) => trade.openedAt));
  const weeks = Math.max(1, Math.floor((now.getTime() - first) / (7 * DAY_MS)) + 1);
  const byWeek = new Map<string, number>();
  for (const item of outcomes(trades)) {
    const week = weekRange(todayInCancun(new Date(item.closedAt))).start;
    byWeek.set(week, (byWeek.get(week) ?? 0) + item.pnlCents);
  }
  const positive = [...byWeek.values()].filter((value) => value > 0).length;
  return (
    <Panel title="Tu práctica">
      <p className="text-interfaz">
        Llevas <span className="cifras font-medium">{weeks}</span> {weeks === 1 ? "semana" : "semanas"} practicando.{" "}
        <span className="cifras font-medium">{positive}</span> de <span className="cifras font-medium">{byWeek.size}</span>{" "}
        {byWeek.size === 1 ? "semana con operaciones terminó" : "semanas con operaciones terminaron"} con ganancia.
      </p>
      <p className="text-etiqueta text-texto-2">
        Antes de arriesgar dinero real se sugieren 2–3 meses (de 9 a 13 semanas) con resultados consistentes: ganancia en la mayoría de
        las semanas, siguiendo tu plan y sin pasar tus límites de pérdida.
      </p>
    </Panel>
  );
}
