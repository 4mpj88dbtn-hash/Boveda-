import { z } from "zod";
import { CURRENCIES } from "@/lib/money";
import { ATTACHMENT_TYPES, ISO_DATE_PATTERN } from "@/modules/finance/types";

/**
 * Datos de Trading (Fase 5). Precios y títulos van como texto decimal (big.js); las
 * comisiones en centavos enteros con la moneda de la operación.
 */

const id = z.string().min(1).max(64);
/** Precio o cantidad positiva con hasta 8 decimales, como texto ("612.35", "0.0525"). */
export const DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/;
const decimal = z.string().regex(DECIMAL_PATTERN);

export const TRADE_ACCOUNTS = ["simulador", "real"] as const;
export type TradeAccount = (typeof TRADE_ACCOUNTS)[number];

export const DIRECTIONS = ["largo", "corto"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_LABELS: Record<Direction, string> = { largo: "Compra (largo)", corto: "Venta en corto" };

export const EMOTIONS = ["calma", "miedo", "fomo", "euforia"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const EMOTION_LABELS: Record<Emotion, string> = { calma: "Calma", miedo: "Miedo", fomo: "FOMO", euforia: "Euforia" };

export const EXIT_REASONS = ["manual", "stop", "objetivo"] as const;
export type ExitReason = (typeof EXIT_REASONS)[number];
export const EXIT_REASON_LABELS: Record<ExitReason, string> = { manual: "Cierre manual", stop: "Tocó el stop", objetivo: "Llegó al objetivo" };

export const tradeSchema = z
  .object({
    id,
    account: z.enum(TRADE_ACCOUNTS),
    /** Activo del catálogo (simulador) o null si lo escribiste a mano. */
    assetId: z.string().min(1).max(40).nullable(),
    symbol: z.string().trim().min(1).max(40),
    currency: z.enum(CURRENCIES),
    direction: z.enum(DIRECTIONS),
    strategy: z.string().trim().max(60),
    /** Instante de la entrada (ms UTC). En el simulador, la hora del precio publicado. */
    openedAt: z.number(),
    entryPrice: decimal,
    stopLoss: decimal,
    target: decimal.nullable(),
    quantity: decimal,
    feesCents: z.number().int().safe().min(0),
    status: z.enum(["abierta", "cerrada"]),
    closedAt: z.number().nullable(),
    exitPrice: decimal.nullable(),
    exitReason: z.enum(EXIT_REASONS).nullable(),
    emotion: z.enum(EMOTIONS).nullable(),
    followedPlan: z.boolean().nullable(),
    /** ¿Completaste el checklist antes de entrar? */
    checklistComplete: z.boolean(),
    lesson: z.string().max(500),
    notes: z.string().max(500),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .refine((trade) => (trade.status === "cerrada") === (trade.closedAt !== null && trade.exitPrice !== null), {
    message: "Una operación cerrada necesita hora y precio de salida.",
  });
export type Trade = z.infer<typeof tradeSchema>;

/** Captura de la gráfica de una operación, guardada en el dispositivo. */
export const tradeImageSchema = z.object({
  id,
  tradeId: id,
  mimeType: z.enum(ATTACHMENT_TYPES),
  data: z.instanceof(ArrayBuffer),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.number(),
});
export type TradeImage = z.infer<typeof tradeImageSchema>;

/** Revisión semanal guiada: respuestas por pregunta. La llave es el lunes de la semana. */
export const tradeReviewSchema = z.object({
  weekStart: z.string().regex(ISO_DATE_PATTERN),
  answers: z.record(z.string().max(40), z.string().max(1000)),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TradeReview = z.infer<typeof tradeReviewSchema>;

/** Reglas de riesgo y capital (Plan → Reglas). Los porcentajes son de tu capital. */
export const tradingRulesSchema = z.object({
  simCapitalCents: z.number().int().min(10_000).max(100_000_000_00),
  riskPercent: z.number().min(0.1).max(2),
  dailyLossPercent: z.number().min(0.5).max(10),
  weeklyLossPercent: z.number().min(1).max(20),
  realCurrency: z.enum(CURRENCIES),
  realCapitalCents: z.number().int().positive().nullable(),
});
export type TradingRules = z.infer<typeof tradingRulesSchema>;

/**
 * Valores de inicio (propuesta, editables): $10,000 USD ficticios, 1% de riesgo por operación
 * y límites de pérdida de 3% al día y 6% a la semana.
 */
export const DEFAULT_TRADING_RULES: TradingRules = {
  simCapitalCents: 1_000_000,
  riskPercent: 1,
  dailyLossPercent: 3,
  weeklyLossPercent: 6,
  realCurrency: "MXN",
  realCapitalCents: null,
};

/** Plan de trading escrito por ti (§5.4). */
export const tradingPlanSchema = z.object({
  instruments: z.string().max(1000),
  schedule: z.string().max(1000),
  entryRules: z.string().max(1000),
  exitRules: z.string().max(1000),
  maxRisk: z.string().max(1000),
  updatedAt: z.number(),
});
export type TradingPlan = z.infer<typeof tradingPlanSchema>;
