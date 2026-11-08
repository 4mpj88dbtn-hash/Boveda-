"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { showToast } from "@/components/ui/toast";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { assetById } from "@/modules/markets/catalog";
import { useMarketFile } from "@/modules/markets/data";
import type { Quote } from "@/modules/markets/lib/schema";
import { formatAge } from "@/modules/markets/market-ui";
import { closeTrade, useTrades, useTradingRules } from "./data";
import { closedPnlCents, initialRiskCents, lossLimits, maxRiskCents, priceText, rMultiple, simAccountState, tradePnlCents, type LossLimits } from "./lib/trades";
import { OrderSheet } from "./order-sheet";
import { tradability, TRADABLE_ASSETS, type Tradability } from "./simulator";
import { TradeSheet } from "./trade-sheet";
import { formatInstant, formatPrice, formatQuantity, formatR, Stat, tradabilityText, unitsLabel, useNow } from "./trading-ui";
import { DIRECTION_LABELS, EXIT_REASON_LABELS, type Trade } from "./types";

/** Simulador con capital ficticio y los precios que publica GitHub Actions (§5.1). */
export function SimulatorView() {
  const trades = useTrades();
  const rules = useTradingRules();
  const market = useMarketFile();
  const now = useNow();
  const [ordering, setOrdering] = useState(false);
  const [journal, setJournal] = useState<Trade | null>(null);

  if (!trades || !rules || !now) return null;

  const quotes = market.data?.activos ?? {};
  const prices = Object.fromEntries(TRADABLE_ASSETS.map((asset) => [asset.id, quotes[asset.id]?.precio]));
  const account = simAccountState(rules.simCapitalCents, trades, prices);
  const limits = lossLimits(rules.simCapitalCents, trades, rules, now);
  const sim = trades.filter((trade) => trade.account === "simulador");
  const open = sim.filter((trade) => trade.status === "abierta");
  const closed = sim
    .filter((trade) => trade.status === "cerrada")
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
  const pendingJournal = closed.filter((trade) => trade.followedPlan === null).length;
  const strategies = [...new Set(trades.map((trade) => trade.strategy).filter(Boolean))];

  async function closeAtMarket(trade: Trade, quote: Quote) {
    if (!quote.hora) return;
    const closedTrade = await closeTrade(trade.id, priceText(quote.precio), Date.parse(quote.hora), "manual");
    if (!closedTrade) return;
    const pnl = closedPnlCents(closedTrade) ?? 0;
    showToast({ message: `Cerraste ${trade.symbol}: ${formatMoney(pnl, "USD", { signDisplay: "exceptZero" })}` });
    setJournal(closedTrade);
  }

  return (
    <>
      <Panel title="Cuenta de práctica" action={<span className="text-etiqueta text-texto-2">Dinero ficticio</span>}>
        <div className="flex flex-col gap-1">
          <p className="font-serif text-cifra-lg font-semibold">
            <Amount cents={account.equityCents + (account.unrealizedCents ?? 0)} currency="USD" />
          </p>
          <p className="text-etiqueta text-texto-2">
            Empezaste con {formatMoney(account.capitalCents, "USD")}.{" "}
            <Amount cents={account.equityCents + (account.unrealizedCents ?? 0) - account.capitalCents} currency="USD" tone="variacion" /> en total.
          </p>
        </div>
        <dl className="flex flex-col divide-y divide-borde">
          <Stat label="Ganado o perdido en cerradas">
            <Amount cents={account.realizedCents} currency="USD" tone="variacion" />
          </Stat>
          <Stat label="En operaciones abiertas">
            {account.unrealizedCents === null ? "—" : <Amount cents={account.unrealizedCents} currency="USD" tone="variacion" />}
          </Stat>
          <Stat label="Disponible para operar">
            <Amount cents={account.availableCents} currency="USD" />
          </Stat>
          <Stat label={`Riesgo por operación (${rules.riskPercent}%)`}>
            <Amount cents={maxRiskCents(account.equityCents, rules.riskPercent)} currency="USD" />
          </Stat>
        </dl>
        <LimitsBlock limits={limits} rules={rules} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" onClick={() => setOrdering(true)} disabled={limits.blocked !== null}>
            <Plus aria-hidden className="size-5" />
            Nueva operación
          </Button>
          <Link href="/trading/plan" className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
            Cambiar capital y reglas
          </Link>
        </div>
      </Panel>

      <Panel title="Operaciones abiertas">
        {open.length === 0 ? (
          <EmptyState
            title="Sin operaciones abiertas"
            description="Toca Nueva operación: eliges el activo, defines tu stop y la app calcula cuántos títulos puedes comprar sin arriesgar más de tu regla."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {open.map((trade) => {
              const asset = trade.assetId ? assetById(trade.assetId) : undefined;
              const quote = trade.assetId ? quotes[trade.assetId] : undefined;
              const status: Tradability = asset ? tradability(asset, quote, now) : { ok: false, reason: "sin-precio", ageMinutes: null };
              return (
                <OpenPosition key={trade.id} trade={trade} quote={quote} status={status} now={now} onClose={() => quote && void closeAtMarket(trade, quote)} />
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Últimas cerradas"
        action={
          <Link href="/trading/diario" className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
            Ver diario
          </Link>
        }
      >
        {closed.length === 0 ? (
          <EmptyState title="Todavía no cierras operaciones" description="Al cerrar una, la app te pide completar tu diario: si seguiste tu plan y qué aprendiste." />
        ) : (
          <>
            {pendingJournal > 0 ? (
              <p className="text-etiqueta text-laton">
                {pendingJournal === 1 ? "1 operación espera" : `${pendingJournal} operaciones esperan`} tu diario. Tócala para completarlo.
              </p>
            ) : null}
            <ul className="flex flex-col divide-y divide-borde">
              {closed.slice(0, 5).map((trade) => (
                <li key={trade.id}>
                  <button type="button" onClick={() => setJournal(trade)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-interfaz font-medium">
                        {trade.symbol} <span className="font-normal text-texto-2">· {DIRECTION_LABELS[trade.direction]}</span>
                      </span>
                      <span className="truncate text-etiqueta text-texto-2">
                        {trade.exitReason ? EXIT_REASON_LABELS[trade.exitReason] : "Cerrada"} · {trade.closedAt ? formatInstant(trade.closedAt) : ""}
                        {trade.followedPlan === null ? " · Diario pendiente" : ""}
                      </span>
                    </span>
                    <Amount cents={closedPnlCents(trade) ?? 0} currency="USD" tone="variacion" className="text-interfaz" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <p className="text-nota text-texto-2">
        Precios de Yahoo Finance que publica GitHub Actions cada 20 minutos con la bolsa abierta y cada 3 horas fuera de horario.
        Acciones y ETFs se operan solo con la Bolsa de Nueva York abierta; cripto, a toda hora. Las órdenes se registran al último
        precio publicado, y tus stops y objetivos se revisan con las velas de 5 y 30 minutos (y diarias para lo más antiguo). En
        la vida real el precio de ejecución puede ser distinto.
      </p>
      <EducationalNotice />

      {ordering ? (
        <OrderSheet
          rules={rules}
          account={account}
          quotes={quotes}
          blocked={limits.blocked}
          strategies={strategies}
          onClose={() => setOrdering(false)}
        />
      ) : null}
      {journal ? <TradeSheet trade={journal} onClose={() => setJournal(null)} /> : null}
    </>
  );
}

function OpenPosition({ trade, quote, status, now, onClose }: { trade: Trade; quote: Quote | undefined; status: Tradability; now: Date; onClose: () => void }) {
  const price = quote ? priceText(quote.precio) : null;
  const pnl = price ? tradePnlCents(trade, price) : null;
  const risk = initialRiskCents(trade);
  const r = pnl === null ? null : rMultiple(pnl, risk);
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-interfaz font-medium">
          {trade.symbol}{" "}
          <span className="font-normal text-texto-2">
            · {DIRECTION_LABELS[trade.direction]} · {formatQuantity(trade.quantity)} {unitsLabel(trade)}
          </span>
        </span>
        {pnl === null ? <span className="text-texto-2">—</span> : <Amount cents={pnl} currency="USD" tone="variacion" className="text-interfaz font-medium" />}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-etiqueta sm:grid-cols-4">
        <div>
          <dt className="text-texto-2">Entrada</dt>
          <dd className="cifras">{formatPrice(trade.entryPrice, trade.currency)}</dd>
        </div>
        <div>
          <dt className="text-texto-2">Ahora</dt>
          <dd className="cifras">{price ? formatPrice(price, trade.currency) : "—"}</dd>
        </div>
        <div>
          <dt className="text-texto-2">Stop</dt>
          <dd className="cifras">{formatPrice(trade.stopLoss, trade.currency)}</dd>
        </div>
        <div>
          <dt className="text-texto-2">Objetivo</dt>
          <dd className="cifras">{trade.target ? formatPrice(trade.target, trade.currency) : "Sin objetivo"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-nota text-texto-2">
          Desde {formatInstant(trade.openedAt)} · Arriesgas {formatMoney(risk, "USD")}
          {r !== null ? ` · ${formatR(r)}` : ""}
          {quote?.hora ? ` · Precio ${formatAge(quote.hora, now)}` : ""}
        </span>
        <Button variant="secundario" onClick={onClose} disabled={!status.ok} aria-label={`Cerrar ${trade.symbol} al precio actual`}>
          Cerrar al precio actual
        </Button>
      </div>
      {!status.ok ? <p className="text-nota text-texto-2">{tradabilityText(status, now)}</p> : null}
    </li>
  );
}

function LimitsBlock({ limits, rules }: { limits: LossLimits; rules: { dailyLossPercent: number; weeklyLossPercent: number } }) {
  const rows = [
    { label: `Pérdida hoy · límite ${rules.dailyLossPercent}%`, state: limits.day },
    { label: `Pérdida semanal · límite ${rules.weeklyLossPercent}%`, state: limits.week },
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ label, state }) => {
        const used = state.limitCents > 0 ? Math.min(1, Math.max(0, -state.pnlCents) / state.limitCents) : 1;
        return (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-etiqueta">
              <span className="text-texto-2">{label}</span>
              <span className="cifras whitespace-nowrap">
                {formatMoney(Math.max(0, -state.pnlCents), "USD")} de {formatMoney(state.limitCents, "USD")}
              </span>
            </div>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(used * 100)}
              className="h-1.5 overflow-hidden rounded-full bg-elevada"
            >
              <div className={cn("h-full rounded-full", state.reached ? "bg-negativo-texto" : used > 0.66 ? "bg-laton" : "bg-acero")} style={{ width: `${used * 100}%` }} />
            </div>
          </div>
        );
      })}
      {limits.blocked ? (
        <p role="status" className="text-interfaz font-medium text-negativo-texto">
          {limits.blocked === "dia"
            ? `Llegaste a tu límite de pérdida del día (${formatPercent(rules.dailyLossPercent / 100, 1, "auto")}). Puedes volver a operar mañana.`
            : `Llegaste a tu límite de pérdida de la semana (${formatPercent(rules.weeklyLossPercent / 100, 1, "auto")}). Puedes volver a operar el lunes.`}{" "}
          Usa este tiempo para revisar tu diario.
        </p>
      ) : null}
    </div>
  );
}
