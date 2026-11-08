"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { assetById, requiredKey } from "./catalog";
import { useIntraday, useMarketFile, useSeries } from "./data";
import { formatChange, formatQuote, quoteChange } from "./lib/format";
import { macd, rsi, sma } from "./lib/indicators";
import { periodReturns, type Point } from "./lib/returns";
import type { Candle } from "./lib/schema";
import { formatDataTime, MarketStatusLine } from "./market-ui";
import { PriceChart, type ChartLayer } from "./price-chart";

const PERIODS = ["1D", "5D", "1M", "6M", "YTD", "1A", "5A", "Máx"] as const;
type Period = (typeof PERIODS)[number];
const INDICATORS = ["MA50", "MA200", "RSI", "MACD", "Volumen"] as const;
type Indicator = (typeof INDICATORS)[number];

/** Velas del periodo elegido (con historia previa para que las medias tengan con qué empezar). */
function candlesFor(period: Period, daily: Candle[], weekly: Candle[], oneDay: Candle[], fiveDays: Candle[]) {
  if (period === "1D") return { all: oneDay, from: 0, intraday: true };
  if (period === "5D") return { all: fiveDays, from: 0, intraday: true };
  if (period === "Máx") return { all: weekly.length > 0 ? weekly : daily, from: 0, intraday: false };
  const last = daily.at(-1)?.[0] ?? 0;
  const date = new Date(last * 1000);
  const months = { "1M": 1, "6M": 6, "1A": 12, "5A": 60 } as const;
  const from =
    period === "YTD"
      ? Date.UTC(date.getUTCFullYear(), 0, 1) / 1000
      : (() => {
          const copy = new Date(date);
          copy.setUTCMonth(copy.getUTCMonth() - months[period]);
          return copy.getTime() / 1000;
        })();
  return { all: daily, from, intraday: false };
}

export function AssetView({ id }: { id: string }) {
  const asset = assetById(id);
  const market = useMarketFile();
  const intraday = useIntraday(asset?.soloHistoria ? null : id);
  const series = useSeries(id);
  const [period, setPeriod] = useState<Period>("1M");
  const [type, setType] = useState<"linea" | "velas">("linea");
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const daily = useMemo(() => series.data?.diario ?? [], [series.data]);
  const weekly = useMemo(() => series.data?.semanal ?? [], [series.data]);
  const oneDay = useMemo(() => intraday.data?.unDia ?? [], [intraday.data]);
  const fiveDays = useMemo(() => intraday.data?.cincoDias ?? [], [intraday.data]);

  const chart = useMemo(() => {
    const { all, from, intraday: isIntraday } = candlesFor(period, daily, weekly, oneDay, fiveDays);
    const start = Math.max(0, all.findIndex((candle) => candle[0] >= from));
    const closes = all.map((candle) => candle[4]);
    const visible = all.slice(start);
    const point = (index: number, value: number | null | undefined) =>
      value === null || value === undefined ? null : { time: all[index]?.[0] ?? 0, value };
    const slice = (values: (number | null)[]) =>
      values
        .map((value, index) => point(index, value))
        .slice(start)
        .filter((item): item is { time: number; value: number } => item !== null);

    const layers: ChartLayer[] = [];
    if (type === "velas") {
      layers.push({
        kind: "candles",
        data: visible.map(([time, open, high, low, close]) => ({ time, open, high, low, close })),
      });
    } else {
      layers.push({ kind: "area", data: visible.map((candle) => ({ time: candle[0], value: candle[4] })), color: "laton" });
    }
    if (indicators.includes("MA50")) layers.push({ kind: "line", data: slice(sma(closes, 50)), color: "acero", width: 1, title: "MA50" });
    if (indicators.includes("MA200")) layers.push({ kind: "line", data: slice(sma(closes, 200)), color: "texto-2", width: 1, title: "MA200" });
    let pane = 1;
    if (indicators.includes("Volumen") && visible.some((candle) => candle[5] > 0)) {
      layers.push({
        kind: "histogram",
        pane: pane++,
        color: "borde-control",
        data: visible.map(([time, open, , , close, volume]) => ({ time, value: volume, color: close >= open ? "positivo" : "negativo" })),
      });
    }
    if (indicators.includes("RSI")) {
      layers.push({ kind: "line", data: slice(rsi(closes, 14)), color: "acero", width: 1, pane: pane++, title: "RSI 14", guides: [30, 70] });
    }
    if (indicators.includes("MACD")) {
      const result = macd(closes);
      const macdPane = pane++;
      layers.push({ kind: "line", data: slice(result.macd), color: "acero", width: 1, pane: macdPane, title: "MACD" });
      layers.push({ kind: "line", data: slice(result.signal), color: "laton", width: 1, pane: macdPane, title: "Señal" });
      layers.push({
        kind: "histogram",
        pane: macdPane,
        color: "borde-control",
        data: result.histogram
          .map((value, index) => (value === null ? null : { time: all[index]?.[0] ?? 0, value, color: value >= 0 ? "positivo" : "negativo" }))
          .slice(start)
          .filter((item): item is { time: number; value: number; color: string } => item !== null),
      });
    }
    return { layers, intraday: isIntraday, panes: pane, empty: visible.length < 2 };
  }, [period, type, indicators, daily, weekly, oneDay, fiveDays]);

  const returns = useMemo(() => periodReturns(daily.map((candle) => [candle[0], candle[4]] as Point)), [daily]);

  if (!asset) return <p className="text-interfaz">Ese activo no existe.</p>;
  const quote = market.data?.activos[id];
  const change = quote ? quoteChange(quote.precio, quote.cierreAnterior) : null;
  const missingKey = requiredKey(asset);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Link href="/mercados" className="flex min-h-11 items-center gap-1 self-start text-etiqueta text-texto-2 hover:text-texto">
          <ChevronLeft aria-hidden className="size-4" />
          Mercados
        </Link>
        <h1 className="text-display lg:text-display-lg">{asset.nombre}</h1>
        {quote ? (
          <div className="flex flex-col gap-1">
            <p className="cifras font-serif text-hero font-semibold">{formatQuote(quote.precio, asset.unidad)}</p>
            {change ? (
              <p
                className={cn(
                  "cifras text-interfaz",
                  change.absolute > 0 ? "text-positivo" : change.absolute < 0 ? "text-negativo-texto" : "text-texto-2",
                )}
              >
                {formatChange(change, asset.unidad, quote.precio)} {asset.tipo === "cripto" ? "en 24 horas" : "hoy"}
              </p>
            ) : null}
            <p className="text-etiqueta text-texto-2">
              Fuente: {quote.fuente} · dato de {quote.fechaDato ? quote.fechaDato.split("-").reverse().join("/") : quote.hora ? formatDataTime(quote.hora) : "—"}
              {quote.retrasoMin ? ` · con ${quote.retrasoMin} min de retraso` : ""}
              {quote.estado === "anterior" ? " · la fuente no respondió en la última actualización" : ""}
            </p>
          </div>
        ) : missingKey ? (
          <p className="text-interfaz text-texto-2">
            Este dato necesita la clave gratuita {missingKey}. Los pasos están al final de Mercados.
          </p>
        ) : null}
        {asset.tipo !== "cripto" && asset.unidad !== "%" ? <MarketStatusLine className="text-etiqueta" /> : null}
      </header>

      <Panel>
        <div role="group" aria-label="Periodo" className="-mx-1 flex gap-1 overflow-x-auto">
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              disabled={(option === "1D" || option === "5D") && Boolean(asset.soloHistoria || missingKey)}
              className={cn(
                "h-11 min-w-11 shrink-0 rounded-full px-3 text-etiqueta font-medium transition-colors duration-120 ease-boveda disabled:opacity-40",
                period === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Tipo de gráfica" className="flex rounded-full bg-fondo p-1">
            {(["linea", "velas"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={type === option}
                onClick={() => setType(option)}
                className={cn(
                  "h-11 rounded-full px-3 text-etiqueta font-medium",
                  type === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
                )}
              >
                {option === "linea" ? "Línea" : "Velas"}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Indicadores" className="flex flex-wrap gap-1">
            {INDICATORS.map((indicator) => (
              <button
                key={indicator}
                type="button"
                aria-pressed={indicators.includes(indicator)}
                onClick={() =>
                  setIndicators((list) => (list.includes(indicator) ? list.filter((item) => item !== indicator) : [...list, indicator]))
                }
                className={cn(
                  "h-11 rounded-full border px-3 text-etiqueta transition-colors duration-120 ease-boveda",
                  indicators.includes(indicator) ? "border-laton text-texto" : "border-borde text-texto-2 hover:text-texto",
                )}
              >
                {indicator}
              </button>
            ))}
          </div>
        </div>

        {series.status === "cargando" && chart.empty ? (
          <p className="text-interfaz text-texto-2">Cargando gráfica…</p>
        ) : chart.empty ? (
          <p className="text-interfaz text-texto-2">Sin datos para este periodo todavía.</p>
        ) : (
          <PriceChart layers={chart.layers} intraday={chart.intraday} height={300 + (chart.panes - 1) * 110} />
        )}
        <p className="text-nota text-texto-2">
          {period === "Máx" ? "Máx usa velas semanales: ahí las medias son de 50 y 200 semanas. " : ""}
          {chart.intraday ? "Horas en hora de Cancún. " : ""}
          {series.data ? `Historia: ${series.data.fuente}. ` : ""}
          Gráficas de TradingView Lightweight Charts™.
        </p>
      </Panel>

      <Panel title="Rendimientos">
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {returns.map((item) => (
            <div key={item.period} className="flex flex-col gap-0.5">
              <dt className="text-etiqueta text-texto-2">{item.period}</dt>
              <dd
                className={cn(
                  "cifras text-interfaz",
                  item.value === null ? "text-texto-2" : item.value >= 0 ? "text-positivo" : "text-negativo-texto",
                )}
              >
                {item.value === null ? "—" : formatPercent(item.value, 1)}
              </dd>
              {item.annualized !== null ? (
                <dd className="cifras text-nota text-texto-2">CAGR {formatPercent(item.annualized, 1)}</dd>
              ) : null}
            </div>
          ))}
        </dl>
        <p className="text-nota text-texto-2">
          Rendimiento de precio, sin dividendos. CAGR = (final ÷ inicial)^(1 ÷ años) − 1: la tasa anual que da el mismo
          resultado.
        </p>
      </Panel>

      <EducationalNotice />
    </>
  );
}
