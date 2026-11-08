import { APP_TIME_ZONE } from "@/lib/dates";
import type { Trade } from "../types";
import { EMOTION_LABELS } from "../types";
import { expectancy, maxDrawdown, profitFactor } from "./calculators";
import { closedPnlCents, initialRiskCents, rMultiple } from "./trades";

/**
 * Estadísticas automáticas del diario (§5.2), con las operaciones cerradas en el orden en que
 * se cerraron. Las razones (porcentajes, esperanza, factor de beneficio) son proyecciones: se
 * calculan con `number` y se redondean al mostrar.
 */

export type Outcome = { trade: Trade; pnlCents: number; riskCents: number; r: number | null; closedAt: number };

export function outcomes(trades: Trade[]): Outcome[] {
  return trades
    .filter((trade) => trade.status === "cerrada" && trade.closedAt !== null && trade.exitPrice !== null)
    .map((trade) => {
      const pnlCents = closedPnlCents(trade) ?? 0;
      const riskCents = initialRiskCents(trade);
      return { trade, pnlCents, riskCents, r: rMultiple(pnlCents, riskCents), closedAt: trade.closedAt ?? 0 };
    })
    .sort((a, b) => a.closedAt - b.closedAt || a.trade.openedAt - b.trade.openedAt);
}

export type Group = { key: string; label: string; count: number; wins: number; netCents: number; winRate: number };

export type JournalStats = {
  count: number;
  wins: number;
  losses: number;
  /** Ni ganó ni perdió (resultado exacto de $0). */
  breakeven: number;
  winRate: number | null;
  grossProfitCents: number;
  /** En positivo. */
  grossLossCents: number;
  netCents: number;
  averageWinCents: number | null;
  /** En positivo. */
  averageLossCents: number | null;
  /** Ganancia promedio / pérdida promedio. */
  payoff: number | null;
  /** Por operación, en centavos (sin redondear). */
  expectancyCents: number | null;
  averageR: number | null;
  profitFactor: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: { kind: "ganadora" | "perdedora"; length: number } | null;
  /** ratio es null si no hay capital inicial con qué comparar. */
  drawdown: { ratio: number | null; amountCents: number } | null;
  /** Curva de capital: el punto de partida y uno por cada operación cerrada. */
  equity: { at: number | null; cents: number }[];
  byStrategy: Group[];
  byWeekday: Group[];
  byHour: Group[];
  byEmotion: Group[];
  byPlan: Group[];
};

const WEEKDAY = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, weekday: "long" });
const HOUR = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, hour: "2-digit", hourCycle: "h23" });
const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function group(list: Outcome[], keyOf: (outcome: Outcome) => string | null, labelOf: (key: string) => string, order?: (a: string, b: string) => number): Group[] {
  const map = new Map<string, Group>();
  for (const outcome of list) {
    const key = keyOf(outcome);
    if (key === null) continue;
    const current = map.get(key) ?? { key, label: labelOf(key), count: 0, wins: 0, netCents: 0, winRate: 0 };
    current.count += 1;
    if (outcome.pnlCents > 0) current.wins += 1;
    current.netCents += outcome.pnlCents;
    current.winRate = current.wins / current.count;
    map.set(key, current);
  }
  const groups = [...map.values()];
  return order ? groups.sort((a, b) => order(a.key, b.key)) : groups.sort((a, b) => b.netCents - a.netCents);
}

/** Hora de entrada en Cancún: "09". */
export function entryHour(openedAt: number): string {
  return HOUR.format(new Date(openedAt)).padStart(2, "0");
}

/** Día de entrada en Cancún: "lunes". */
export function entryWeekday(openedAt: number): string {
  return WEEKDAY.format(new Date(openedAt)).toLowerCase();
}

/**
 * Estadísticas del diario. `startingCents` es el capital inicial (para la curva y el drawdown
 * en %); con null la curva parte de $0 y el drawdown se da solo en dinero.
 */
export function journalStats(trades: Trade[], startingCents: number | null): JournalStats {
  const list = outcomes(trades);
  const wins = list.filter((item) => item.pnlCents > 0);
  const losses = list.filter((item) => item.pnlCents < 0);
  const count = list.length;
  const grossProfitCents = wins.reduce((sum, item) => sum + item.pnlCents, 0);
  const grossLossCents = -losses.reduce((sum, item) => sum + item.pnlCents, 0);
  const averageWinCents = wins.length > 0 ? grossProfitCents / wins.length : null;
  const averageLossCents = losses.length > 0 ? grossLossCents / losses.length : null;
  const winRate = count > 0 ? wins.length / count : null;
  const rs = list.map((item) => item.r).filter((r): r is number => r !== null);

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let run = null as JournalStats["currentStreak"];
  for (const item of list) {
    const kind = item.pnlCents > 0 ? "ganadora" : item.pnlCents < 0 ? "perdedora" : null;
    run = kind === null ? null : run?.kind === kind ? { kind, length: run.length + 1 } : { kind, length: 1 };
    if (run?.kind === "ganadora") longestWinStreak = Math.max(longestWinStreak, run.length);
    if (run?.kind === "perdedora") longestLossStreak = Math.max(longestLossStreak, run.length);
  }

  const start = startingCents ?? 0;
  const equity: JournalStats["equity"] = [{ at: null, cents: start }];
  let running = start;
  for (const item of list) {
    running += item.pnlCents;
    equity.push({ at: item.closedAt, cents: running });
  }
  let drawdown: JournalStats["drawdown"] = null;
  if (count > 0) {
    if (startingCents !== null && startingCents > 0) {
      const result = maxDrawdown(equity.map((point) => point.cents));
      drawdown = result ? { ratio: result.ratio, amountCents: result.amount } : null;
    } else {
      let peak = equity[0]?.cents ?? 0;
      let amount = 0;
      for (const point of equity) {
        peak = Math.max(peak, point.cents);
        amount = Math.max(amount, peak - point.cents);
      }
      drawdown = { ratio: null, amountCents: amount };
    }
  }

  return {
    count,
    wins: wins.length,
    losses: losses.length,
    breakeven: count - wins.length - losses.length,
    winRate,
    grossProfitCents,
    grossLossCents,
    netCents: grossProfitCents - grossLossCents,
    averageWinCents,
    averageLossCents,
    payoff: averageWinCents !== null && averageLossCents !== null && averageLossCents > 0 ? averageWinCents / averageLossCents : null,
    expectancyCents: count > 0 ? expectancy(wins.length / count, averageWinCents ?? 0, averageLossCents ?? 0, losses.length / count) : null,
    averageR: rs.length > 0 ? rs.reduce((sum, r) => sum + r, 0) / rs.length : null,
    profitFactor: profitFactor(grossProfitCents, grossLossCents),
    longestWinStreak,
    longestLossStreak,
    currentStreak: run,
    drawdown,
    equity,
    byStrategy: group(list, (item) => item.trade.strategy.trim() || "Sin estrategia", (key) => key),
    byWeekday: group(list, (item) => entryWeekday(item.trade.openedAt), (key) => key.charAt(0).toUpperCase() + key.slice(1), (a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)),
    byHour: group(list, (item) => entryHour(item.trade.openedAt), (key) => `${key}:00 a ${key}:59`, (a, b) => a.localeCompare(b)),
    byEmotion: group(list, (item) => item.trade.emotion, (key) => EMOTION_LABELS[key as keyof typeof EMOTION_LABELS] ?? key),
    byPlan: group(
      list,
      (item) => (item.trade.followedPlan === null ? null : item.trade.followedPlan ? "si" : "no"),
      (key) => (key === "si" ? "Seguí mi plan" : "No seguí mi plan"),
      (a, b) => b.localeCompare(a),
    ),
  };
}

/** Preguntas de la revisión semanal guiada (§5.4). */
export const REVIEW_QUESTIONS = [
  { id: "plan", text: "¿Seguiste tu plan en cada operación? ¿En cuáles no, y por qué?" },
  { id: "mejor", text: "¿Cuál fue tu mejor operación de la semana? ¿Qué hiciste bien?" },
  { id: "error", text: "¿Cuál fue tu peor error? ¿Fue de análisis, de disciplina o de emociones?" },
  { id: "riesgo", text: "¿Respetaste el stop y el tamaño de posición en todas?" },
  { id: "emociones", text: "¿Qué emoción te dominó al operar y cómo la manejaste?" },
  { id: "sobreoperar", text: "¿Operaste de más o para recuperar una pérdida (revancha)?" },
  { id: "cambio", text: "¿Qué una sola cosa vas a hacer distinto la próxima semana?" },
] as const;
