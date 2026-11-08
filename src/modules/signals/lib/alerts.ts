import type { Quote } from "@/modules/markets/lib/schema";

/** Alertas de precio guardadas en el dispositivo: "avísame si VOO baja de 450". */

export type PriceAlert = {
  id: string;
  assetId: string;
  condition: "mayor" | "menor";
  value: number;
  createdAt: number;
};

export type AlertCheck = { alert: PriceAlert; price: number; triggered: boolean };

/** Revisa cada alerta contra el último precio publicado (si no hay precio, no se evalúa). */
export function checkAlerts(alerts: PriceAlert[], quotes: Record<string, Quote>): AlertCheck[] {
  return alerts.flatMap((alert) => {
    const quote = quotes[alert.assetId];
    if (!quote) return [];
    const triggered = alert.condition === "mayor" ? quote.precio > alert.value : quote.precio < alert.value;
    return [{ alert, price: quote.precio, triggered }];
  });
}

export type TelegramConfig = {
  preapertura: boolean;
  cierre: boolean;
  movimientos: boolean;
  umbrales: Record<string, number>;
  noticias: boolean;
  alertasPrecio: { id: string; condicion: "mayor" | "menor"; valor: number }[];
  aportacionDia: number | null;
  silencioDesde: number;
  silencioHasta: number;
  maxPorHora: number;
  prioridades: ("critica" | "importante" | "informativa")[];
};

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  preapertura: true,
  cierre: true,
  movimientos: true,
  umbrales: { sp500: 1.5, nasdaq: 1.5, btc: 5, usdmxn: 1 },
  noticias: true,
  alertasPrecio: [],
  aportacionDia: null,
  silencioDesde: 23,
  silencioHasta: 7,
  maxPorHora: 4,
  prioridades: ["critica", "importante", "informativa"],
};

/**
 * Texto para la variable SENALES_CONFIG de GitHub (la lee la tarea que manda los avisos).
 * Incluye las alertas de precio del dispositivo si se elige.
 */
export function telegramConfigText(config: TelegramConfig, alerts: PriceAlert[] | null): string {
  const output: TelegramConfig = {
    ...config,
    alertasPrecio: alerts ? alerts.map((alert) => ({ id: alert.assetId, condicion: alert.condition, valor: alert.value })) : [],
  };
  return JSON.stringify(output);
}
