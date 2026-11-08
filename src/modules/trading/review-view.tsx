"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { showToast } from "@/components/ui/toast";
import { addDaysToIsoDate, formatDate, todayInCancun, weekRange } from "@/lib/dates";
import { formatPercent } from "@/lib/money";
import { putTradeReview, useTradeReview, useTrades, useTradingRules } from "./data";
import { journalStats, REVIEW_QUESTIONS } from "./lib/stats";
import { Stat, useNow } from "./trading-ui";
import type { Trade, TradeAccount, TradeReview } from "./types";

/** Revisión semanal guiada del diario (§5.4). */
export function ReviewView() {
  const now = useNow();
  const [offset, setOffset] = useState(0);
  if (!now) return null;
  const thisWeek = weekRange(todayInCancun(now)).start;
  const weekStart = addDaysToIsoDate(thisWeek, offset * 7);
  return <WeekReview key={weekStart} weekStart={weekStart} isCurrent={offset === 0} onMove={(delta) => setOffset(Math.min(0, offset + delta))} />;
}

function WeekReview({ weekStart, isCurrent, onMove }: { weekStart: string; isCurrent: boolean; onMove: (delta: number) => void }) {
  const trades = useTrades();
  const rules = useTradingRules();
  const review = useTradeReview(weekStart);
  if (!trades || !rules || review === undefined) return null;
  const weekEnd = addDaysToIsoDate(weekStart, 6);
  const inWeek = trades.filter((trade) => {
    if (trade.closedAt === null) return false;
    const date = todayInCancun(new Date(trade.closedAt));
    return date >= weekStart && date <= weekEnd;
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button variant="fantasma" size="icono" aria-label="Semana anterior" onClick={() => onMove(-1)}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <p className="text-center text-interfaz font-medium">
          Semana del {formatDate(weekStart)} al {formatDate(weekEnd)}
        </p>
        <Button variant="fantasma" size="icono" aria-label="Semana siguiente" onClick={() => onMove(1)} disabled={isCurrent}>
          <ChevronRight aria-hidden className="size-5" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeekSummary title="Simulador esta semana" trades={inWeek} account="simulador" currency="USD" />
        <WeekSummary title="Reales esta semana" trades={inWeek} account="real" currency={rules.realCurrency} />
      </div>

      <ReviewForm weekStart={weekStart} review={review} />
      <EducationalNotice />
    </>
  );
}

function WeekSummary({ title, trades, account, currency }: { title: string; trades: Trade[]; account: TradeAccount; currency: "MXN" | "USD" }) {
  const list = trades.filter((trade) => trade.account === account && trade.currency === currency);
  const stats = journalStats(list, null);
  const planned = list.filter((trade) => trade.followedPlan !== null);
  const followed = planned.filter((trade) => trade.followedPlan).length;
  const missing = list.filter((trade) => trade.followedPlan === null || trade.lesson.trim() === "").length;
  return (
    <Panel title={title}>
      {stats.count === 0 ? (
        <p className="text-etiqueta text-texto-2">Sin operaciones cerradas.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-borde">
          <Stat label="Cerradas">{stats.count}</Stat>
          <Stat label="Aciertos">{stats.winRate === null ? "—" : formatPercent(stats.winRate, 0, "auto")}</Stat>
          <Stat label="Resultado">
            <Amount cents={stats.netCents} currency={currency} tone="variacion" />
          </Stat>
          <Stat label="Siguiendo tu plan">{planned.length === 0 ? "—" : `${followed} de ${planned.length}`}</Stat>
          {missing > 0 ? <Stat label="Diarios por completar">{missing}</Stat> : null}
        </dl>
      )}
    </Panel>
  );
}

function ReviewForm({ weekStart, review }: { weekStart: string; review: TradeReview | null }) {
  const [answers, setAnswers] = useState<Record<string, string>>(review?.answers ?? {});

  async function save() {
    const now = Date.now();
    const clean = Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== ""));
    await putTradeReview({ weekStart, answers: clean, createdAt: review?.createdAt ?? now, updatedAt: now });
    showToast({ message: "Revisión guardada" });
  }

  return (
    <Panel title="Preguntas de la semana">
      <p className="text-etiqueta text-texto-2">
        Contesta con honestidad: nadie más lo ve. Una revisión corta cada fin de semana vale más que muchas operaciones nuevas.
      </p>
      {REVIEW_QUESTIONS.map((question) => (
        <Field key={question.id} id={`revision-${question.id}`} label={question.text}>
          <Textarea
            id={`revision-${question.id}`}
            maxLength={1000}
            value={answers[question.id] ?? ""}
            onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
          />
        </Field>
      ))}
      <Button className="self-start" onClick={() => void save()}>
        Guardar revisión
      </Button>
      {review ? <p className="text-nota text-texto-2">Guardada el {formatDate(todayInCancun(new Date(review.updatedAt)))}.</p> : null}
    </Panel>
  );
}
