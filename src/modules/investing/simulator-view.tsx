"use client";

import { useEffect, useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { LineChart } from "@/components/ui/line-chart";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { fetchSeries } from "@/modules/markets/data";
import type { SeriesFile } from "@/modules/markets/lib/schema";
import { mergeSeries, simulateMonthlyInvesting } from "./lib/portfolio";

const usd = (value: number) => formatMoney(Math.round(value * 100), "USD");

const SOURCES = {
  sp500tr: { label: "Con dividendos reinvertidos", detail: "Índice S&P 500 Total Return (^SP500TR), desde 1988." },
  sp500: { label: "Solo precio", detail: "Índice S&P 500 (^GSPC), sin dividendos; historia más larga." },
} as const;

/** 10. "Si hubiera invertido $X cada mes desde el año Y", con cierres reales del índice. */
export function SimulatorView() {
  const [source, setSource] = useState<keyof typeof SOURCES>("sp500tr");
  const [files, setFiles] = useState<Partial<Record<keyof typeof SOURCES, SeriesFile | null>>>({});
  const [monthly, setMonthly] = useState("200");
  const [year, setYear] = useState("2010");

  useEffect(() => {
    if (source in files) return;
    let cancelled = false;
    void fetchSeries(source).then((file) => {
      if (!cancelled) setFiles((current) => ({ ...current, [source]: file }));
    });
    return () => {
      cancelled = true;
    };
  }, [source, files]);

  const file = files[source];
  const series: [number, number][] = file
    ? mergeSeries(
        file.semanal.map((candle) => [candle[0], candle[4]]),
        file.diario.map((candle) => [candle[0], candle[4]]),
      )
    : [];
  const firstYear = series[0] ? new Date(series[0][0] * 1000).getUTCFullYear() : null;
  const lastYear = series.at(-1) ? new Date((series.at(-1)?.[0] ?? 0) * 1000).getUTCFullYear() : null;
  const startYear = firstYear !== null ? Math.max(firstYear + 1, Number(year) || firstYear + 1) : null;
  const amount = Number(monthly.replace(/,/g, ""));
  const result = startYear !== null && amount > 0 ? simulateMonthlyInvesting(series, amount, `${startYear}-01`) : null;

  return (
    <>
      <Panel>
        <div role="group" aria-label="Datos del índice" className="flex flex-wrap gap-2">
          {(Object.keys(SOURCES) as (keyof typeof SOURCES)[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={source === key}
              onClick={() => setSource(key)}
              className={cn("h-11 rounded-full border px-4 text-etiqueta", source === key ? "border-laton text-texto" : "border-borde-control text-texto-2")}
            >
              {SOURCES[key].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="sim-mensual" label="Cada mes (USD)">
            <Input id="sim-mensual" inputMode="decimal" value={monthly} onChange={(event) => setMonthly(event.target.value)} />
          </Field>
          <Field id="sim-anio" label="Desde enero de">
            <Select id="sim-anio" value={String(startYear ?? year)} onChange={(event) => setYear(event.target.value)}>
              {firstYear !== null && lastYear !== null
                ? Array.from({ length: lastYear - firstYear }, (_, index) => firstYear + 1 + index).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                : null}
            </Select>
          </Field>
        </div>

        {file === undefined ? <p className="text-interfaz text-texto-2">Cargando la historia del índice…</p> : null}
        {file === null ? (
          <p className="text-interfaz text-texto-2">
            La historia del índice no está disponible ahorita. Se publica una vez al día; revisa tu conexión.
          </p>
        ) : null}

        {result ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <dt className="text-etiqueta text-texto-2">Aportaste</dt>
                <dd className="cifras font-serif text-cifra font-semibold">{usd(result.contributed)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-etiqueta text-texto-2">Tendrías</dt>
                <dd className="cifras font-serif text-cifra font-semibold text-positivo">{usd(result.value)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-etiqueta text-texto-2">Rendimiento anual (XIRR)</dt>
                <dd className="cifras font-serif text-cifra font-semibold">{result.annualized === null ? "—" : formatPercent(result.annualized, 2, "auto")}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-etiqueta text-texto-2">Meses invirtiendo</dt>
                <dd className="cifras font-serif text-cifra font-semibold">{result.months}</dd>
              </div>
            </dl>
            <LineChart
              ariaLabel="Lo aportado y lo que valía la inversión al cierre de cada año"
              labels={result.yearly.map((row) => String(row.year))}
              format={(value) => usd(value).replace(/\.\d{2}$/, "")}
              series={[
                { label: "Aportado", color: "texto-2", dashed: true, values: result.yearly.map((row) => row.contributed) },
                { label: "Valor", color: "laton", values: result.yearly.map((row) => row.value) },
              ]}
            />
            <p className="text-nota text-texto-2">
              Compra el primer día hábil de cada mes desde {result.firstDate.split("-").reverse().join("/")} hasta el último dato (
              {result.lastDate.split("-").reverse().join("/")}). {SOURCES[source].detail} Fuente: {file?.fuente}. En dólares, sin
              comisiones ni impuestos y sin el efecto del tipo de cambio.
            </p>
          </>
        ) : null}
      </Panel>
      <EducationalNotice />
    </>
  );
}
