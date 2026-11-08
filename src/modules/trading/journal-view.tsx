"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { useTrades, useTradingRules } from "./data";
import { closedPnlCents, initialRiskCents, rMultiple } from "./lib/trades";
import { TradeSheet } from "./trade-sheet";
import { AccountSwitch, formatInstant, formatPrice, formatQuantity } from "./trading-ui";
import { DIRECTION_LABELS, EMOTION_LABELS, type Trade, type TradeAccount } from "./types";

type Editing = { trade: Trade | null } | null;

/** Diario de trading (§5.2): cada operación con su plan, emoción, resultado y lección. */
export function JournalView() {
  const trades = useTrades();
  const rules = useTradingRules();
  const [account, setAccount] = useState<TradeAccount>("simulador");
  const [editing, setEditing] = useState<Editing>(null);

  if (!trades || !rules) return null;
  const counts = {
    simulador: trades.filter((trade) => trade.account === "simulador").length,
    real: trades.filter((trade) => trade.account === "real").length,
  };
  const list = trades.filter((trade) => trade.account === account);
  const open = list.filter((trade) => trade.status === "abierta");
  const closed = list.filter((trade) => trade.status === "cerrada").sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
  const pending = closed.filter((trade) => trade.followedPlan === null || trade.lesson.trim() === "").length;

  return (
    <>
      <AccountSwitch value={account} onChange={setAccount} counts={counts} />
      {account === "real" ? (
        <div className="flex flex-col gap-2">
          <Button size="lg" className="self-start" onClick={() => setEditing({ trade: null })}>
            <Plus aria-hidden className="size-5" />
            Registrar operación real
          </Button>
          <p className="text-etiqueta text-texto-2">
            Registra aquí lo que operes con tu casa de bolsa. Moneda de la cuenta: {rules.realCurrency === "USD" ? "dólares" : "pesos"} (cámbiala en Plan).
          </p>
        </div>
      ) : null}

      {list.length === 0 ? (
        <Panel>
          <EmptyState
            title={account === "simulador" ? "Tu diario está vacío" : "Sin operaciones reales"}
            description={
              account === "simulador"
                ? "Cada operación que abres en el Simulador aparece aquí. Al cerrarla, anota si seguiste tu plan y qué aprendiste: así mejoran tus estadísticas."
                : "Practica primero en el Simulador. Cuando operes con dinero real, registra cada operación para comparar tus resultados."
            }
          />
        </Panel>
      ) : null}

      {open.length > 0 ? (
        <Panel title="Abiertas">
          <TradeList trades={open} onOpen={(trade) => setEditing({ trade })} />
        </Panel>
      ) : null}
      {closed.length > 0 ? (
        <Panel title="Cerradas">
          {pending > 0 ? (
            <p className="text-etiqueta text-laton">
              {pending === 1 ? "A 1 operación le falta" : `A ${pending} operaciones les falta`} su diario (plan o lección).
            </p>
          ) : null}
          <TradeList trades={closed} onOpen={(trade) => setEditing({ trade })} />
        </Panel>
      ) : null}
      <EducationalNotice />
      {editing ? <TradeSheet trade={editing.trade} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function TradeList({ trades, onOpen }: { trades: Trade[]; onOpen: (trade: Trade) => void }) {
  return (
    <ul className="flex flex-col divide-y divide-borde">
      {trades.map((trade) => {
        const pnl = closedPnlCents(trade);
        const r = pnl === null ? null : rMultiple(pnl, initialRiskCents(trade));
        const incomplete = trade.status === "cerrada" && (trade.followedPlan === null || trade.lesson.trim() === "");
        return (
          <li key={trade.id}>
            <button type="button" onClick={() => onOpen(trade)} className="flex min-h-16 w-full items-center justify-between gap-3 py-2.5 text-left">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-interfaz font-medium">
                  {trade.symbol}{" "}
                  <span className="font-normal text-texto-2">
                    · {DIRECTION_LABELS[trade.direction]} · {formatQuantity(trade.quantity)} a {formatPrice(trade.entryPrice, trade.currency)}
                  </span>
                </span>
                <span className="truncate text-etiqueta text-texto-2">
                  {formatInstant(trade.openedAt)}
                  {trade.strategy ? ` · ${trade.strategy}` : ""}
                  {trade.emotion ? ` · ${EMOTION_LABELS[trade.emotion]}` : ""}
                  {trade.followedPlan === true ? " · Siguió el plan" : trade.followedPlan === false ? " · Sin seguir el plan" : ""}
                </span>
                {incomplete ? <span className="text-nota text-laton">Completa tu diario</span> : null}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                {pnl === null ? (
                  <span className="text-interfaz text-texto-2">Abierta</span>
                ) : (
                  <Amount cents={pnl} currency={trade.currency} tone="variacion" className="text-interfaz font-medium" />
                )}
                {r !== null ? (
                  <span className="cifras text-nota text-texto-2">
                    {r >= 0 ? "+" : "−"}
                    {Math.abs(r).toLocaleString("es-MX", { maximumFractionDigits: 2 })} R
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
