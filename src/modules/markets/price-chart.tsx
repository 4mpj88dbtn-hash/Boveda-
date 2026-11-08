"use client";

import { TZDate } from "@date-fns/tz";
import { useEffect, useRef } from "react";
import type { IChartApi, Time } from "lightweight-charts";
import { APP_TIME_ZONE } from "@/lib/dates";

/**
 * Gráfica de precios con TradingView Lightweight Charts™ (licencia Apache 2.0).
 * Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/ — el logo de atribución
 * queda visible en la gráfica, como pide la licencia.
 */

export type ChartPoint = { time: number; value: number };
export type ChartCandle = { time: number; open: number; high: number; low: number; close: number };

export type ChartLayer =
  | { kind: "line"; data: ChartPoint[]; color: string; width?: number; pane?: number; title?: string; guides?: number[] }
  | { kind: "area"; data: ChartPoint[]; color: string }
  | { kind: "candles"; data: ChartCandle[] }
  | { kind: "histogram"; data: (ChartPoint & { color?: string })[]; color: string; pane: number };

/** Colores de los tokens de diseño (CSS), para que la gráfica use la misma paleta. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

/**
 * Lightweight Charts muestra los tiempos en UTC. Para verlos en hora de Cancún se recorren
 * con el desfase que da la base de zonas horarias para cada instante.
 */
function toChartTime(seconds: number, intraday: boolean): Time {
  if (!intraday) return new Date(seconds * 1000).toISOString().slice(0, 10) as Time;
  const offsetMinutes = new TZDate(seconds * 1000, APP_TIME_ZONE).getTimezoneOffset();
  return (seconds - offsetMinutes * 60) as Time;
}

export function PriceChart({ layers, intraday, height }: { layers: ChartLayer[]; intraday: boolean; height: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: IChartApi | null = null;
    let disposed = false;
    void import("lightweight-charts").then((lib) => {
      const element = container.current;
      if (disposed || !element) return;
      const border = token("borde");
      chart = lib.createChart(element, {
        autoSize: true,
        layout: {
          background: { type: lib.ColorType.Solid, color: "transparent" },
          textColor: token("texto-2"),
          fontFamily: getComputedStyle(document.body).fontFamily,
          attributionLogo: true,
          panes: { separatorColor: border, separatorHoverColor: border },
        },
        grid: { vertLines: { color: border }, horzLines: { color: border } },
        rightPriceScale: { borderColor: border },
        timeScale: { borderColor: border, timeVisible: intraday, secondsVisible: false },
        crosshair: { mode: lib.CrosshairMode.Normal },
        localization: {
          locale: "es-MX",
          priceFormatter: (price: number) =>
            new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price),
        },
      });
      for (const layer of layers) {
        if (layer.kind === "candles") {
          const series = chart.addSeries(lib.CandlestickSeries, {
            upColor: token("positivo"),
            downColor: token("negativo"),
            wickUpColor: token("positivo"),
            wickDownColor: token("negativo"),
            borderVisible: false,
          });
          series.setData(layer.data.map((point) => ({ ...point, time: toChartTime(point.time, intraday) })));
        } else if (layer.kind === "area") {
          const color = token(layer.color);
          const series = chart.addSeries(lib.AreaSeries, {
            lineColor: color,
            topColor: `${color}40`,
            bottomColor: `${color}05`,
            lineWidth: 2,
          });
          series.setData(layer.data.map((point) => ({ time: toChartTime(point.time, intraday), value: point.value })));
        } else if (layer.kind === "line") {
          const series = chart.addSeries(
            lib.LineSeries,
            {
              color: token(layer.color),
              lineWidth: (layer.width ?? 2) as 1 | 2 | 3 | 4,
              title: layer.title,
              priceLineVisible: false,
              lastValueVisible: Boolean(layer.title),
            },
            layer.pane ?? 0,
          );
          series.setData(layer.data.map((point) => ({ time: toChartTime(point.time, intraday), value: point.value })));
          for (const guide of layer.guides ?? []) {
            series.createPriceLine({ price: guide, color: border, lineWidth: 1, lineStyle: lib.LineStyle.Dashed, axisLabelVisible: true });
          }
        } else {
          const series = chart.addSeries(
            lib.HistogramSeries,
            { color: token(layer.color), priceLineVisible: false, lastValueVisible: false },
            layer.pane,
          );
          series.setData(
            layer.data.map((point) => ({
              time: toChartTime(point.time, intraday),
              value: point.value,
              ...(point.color ? { color: token(point.color) } : {}),
            })),
          );
        }
      }
      chart.timeScale().fitContent();
    });
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [layers, intraday]);

  return <div ref={container} style={{ height }} className="w-full" />;
}
