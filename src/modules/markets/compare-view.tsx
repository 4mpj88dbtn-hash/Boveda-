"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ALL_ASSETS, assetById } from "./catalog";
import { fetchSeries } from "./data";
import { base100, cagr, periodStart, type Point } from "./lib/returns";
import type { SeriesFile } from "./lib/schema";
import { PriceChart, type ChartLayer } from "./price-chart";

const PERIODS = ["1M", "3M", "YTD", "1A", "3A", "5A"] as const;
type Period = (typeof PERIODS)[number];
const COLORS = ["laton", "acero", "positivo", "texto"];
/** Clases completas para que Tailwind las encuentre al compilar. */
const DOT: Record<string, string> = { laton: "bg-laton", acero: "bg-acero", positivo: "bg-positivo", texto: "bg-texto" };
const MAX = 4;

/** Comparador "base 100": todos valen 100 al inicio del periodo para ver cuál rindió más. */
export function CompareView() {
  const [selected, setSelected] = useState<string[]>(["sp500", "nasdaq", "btc", "usdmxn"]);
  const [period, setPeriod] = useState<Period>("1A");
  const [loaded, setLoaded] = useState<Record<string, SeriesFile | null>>({});

  useEffect(() => {
    let cancelled = false;
    for (const id of selected) {
      if (id in loaded) continue;
      void fetchSeries(id).then((file) => {
        if (!cancelled) setLoaded((current) => ({ ...current, [id]: file }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [selected, loaded]);

  const result = useMemo(() => {
    const series = selected
      .map((id) => ({ id, file: loaded[id] }))
      .filter((item): item is { id: string; file: SeriesFile } => Boolean(item.file && item.file.diario.length > 1));
    const lastTimes = series.map((item) => item.file.diario.at(-1)?.[0] ?? 0);
    const last = Math.min(...lastTimes);
    const from = periodStart(period, last);
    const lines = series.map((item, index) => {
      const points = base100(
        item.file.diario.map((candle) => [candle[0], candle[4]] as Point),
        from,
      );
      const first = points[0];
      const end = points.at(-1);
      const years = first && end ? (end[0] - first[0]) / (365.25 * 86_400) : 0;
      return {
        id: item.id,
        color: COLORS[index % COLORS.length] ?? "laton",
        points,
        change: end ? end[1] / 100 - 1 : null,
        annualized: end && years >= 1 ? cagr(100, end[1], years) : null,
      };
    });
    const layers: ChartLayer[] = lines.map((line) => ({
      kind: "line",
      color: line.color,
      width: 2,
      data: line.points.map(([time, value]) => ({ time, value })),
    }));
    return { lines, layers };
  }, [selected, loaded, period]);

  const options = ALL_ASSETS.filter((asset) => asset.yahoo || asset.coinbase);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Link href="/mercados" className="flex min-h-11 items-center gap-1 self-start text-etiqueta text-texto-2 hover:text-texto">
          <ChevronLeft aria-hidden className="size-4" />
          Mercados
        </Link>
        <h1 className="text-display lg:text-display-lg">Comparador base 100</h1>
        <p className="max-w-[65ch] text-interfaz text-texto-2">
          Cada activo vale 100 al inicio del periodo. Si termina en 112, subió 12%. Elige hasta {MAX}.
        </p>
      </header>

      <Panel>
        <div role="group" aria-label="Periodo" className="-mx-1 flex gap-1 overflow-x-auto">
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={cn(
                "h-11 min-w-11 shrink-0 rounded-full px-3 text-etiqueta font-medium",
                period === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        {result.layers.length === 0 ? (
          <p className="text-interfaz text-texto-2">Cargando series…</p>
        ) : (
          <PriceChart layers={result.layers} intraday={false} height={300} />
        )}
        <ul className="flex flex-col gap-1.5">
          {result.lines.map((line) => (
            <li key={line.id} className="flex items-center justify-between gap-3 text-interfaz">
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn("size-3 rounded-full", DOT[line.color])} />
                {assetById(line.id)?.nombre}
              </span>
              <span className="cifras">
                <span className={line.change !== null && line.change >= 0 ? "text-positivo" : "text-negativo-texto"}>
                  {line.change === null ? "—" : formatPercent(line.change, 1)}
                </span>
                {line.annualized !== null ? (
                  <span className="text-etiqueta text-texto-2"> · {formatPercent(line.annualized, 1)} anual</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-nota text-texto-2">
          Rendimiento de precio (sin dividendos), en la moneda de cada activo. Dólar/peso sube cuando el peso se debilita.
        </p>
      </Panel>

      <Panel title="Activos">
        <div className="flex flex-wrap gap-2">
          {options.map((asset) => {
            const active = selected.includes(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                aria-pressed={active}
                disabled={!active && selected.length >= MAX}
                onClick={() =>
                  setSelected((list) => (active ? list.filter((id) => id !== asset.id) : [...list, asset.id]))
                }
                className={cn(
                  "h-11 rounded-full border px-3 text-etiqueta transition-colors duration-120 ease-boveda disabled:opacity-40",
                  active ? "border-laton text-texto" : "border-borde text-texto-2 hover:text-texto",
                )}
              >
                {asset.nombre}
              </button>
            );
          })}
        </div>
      </Panel>

      <EducationalNotice />
    </>
  );
}
