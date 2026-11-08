"use client";

import { useState } from "react";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { useDataFile } from "@/modules/markets/data";
import { formatAge } from "@/modules/markets/market-ui";
import { assessCompany, METRICS, parseFundamentalsFile, type Light } from "./lib/fundamentals";

const DOT: Record<Light, string> = { verde: "bg-positivo", amarillo: "bg-laton", rojo: "bg-negativo-texto", gris: "bg-borde-control" };
const LIGHT_LABEL: Record<Light, string> = { verde: "Bien", amarillo: "Regular", rojo: "Alerta", gris: "Sin dato" };

const format = (value: number | null, unit: string) =>
  value === null ? "—" : `${value.toLocaleString("es-MX", { maximumFractionDigits: unit === "%" ? 1 : 2 })}${unit === "%" ? "%" : "x"}`;

/** Análisis fundamental con semáforo (necesita la clave gratuita de Finnhub). */
export function CompaniesView() {
  const file = useDataFile("/datos/fundamentales.json", parseFundamentalsFile, 60 * 60_000);
  const [open, setOpen] = useState<string | null>(null);
  const companies = file.data?.empresas ?? [];

  return (
    <>
      {file.status === "cargando" && !file.data ? <p className="text-interfaz text-texto-2">Cargando empresas…</p> : null}
      {!file.data && file.status !== "cargando" ? (
        <Panel>
          <EmptyState
            title="Falta la clave gratuita de Finnhub"
            description="Crea una cuenta gratuita en finnhub.io, copia tu API key y guárdala en GitHub como secreto FINNHUB_API_KEY (Settings → Secrets and variables → Actions). Al día siguiente verás aquí valuación, rentabilidad, crecimiento, salud financiera y dividendos de 21 empresas grandes, con semáforo."
          />
        </Panel>
      ) : null}

      {companies.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {companies.map((company) => {
            const result = assessCompany(company, companies);
            const counts = { verde: 0, amarillo: 0, rojo: 0, gris: 0 };
            for (const item of result.items) counts[item.light] += 1;
            const expanded = open === company.simbolo;
            return (
              <li key={company.simbolo} className="rounded-tarjeta border border-borde bg-superficie">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : company.simbolo)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-interfaz font-medium">
                      {company.nombre} <span className="text-texto-2">{company.simbolo}</span>
                    </span>
                    <span className="truncate text-etiqueta text-texto-2">{company.sector ?? "Sector sin dato"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-etiqueta" aria-label={`${counts.verde} bien, ${counts.amarillo} regular, ${counts.rojo} en alerta`}>
                    {(["verde", "amarillo", "rojo"] as const).map((light) => (
                      <span key={light} className="flex items-center gap-1">
                        <span aria-hidden className={cn("size-2.5 rounded-full", DOT[light])} />
                        <span className="cifras">{counts[light]}</span>
                      </span>
                    ))}
                  </span>
                </button>
                {expanded ? (
                  <div className="flex flex-col gap-3 border-t border-borde px-3 py-3">
                    <p className="text-etiqueta text-texto-2">Comparada con {result.peers}.</p>
                    {["Valuación", "Rentabilidad", "Crecimiento", "Salud financiera", "Dividendos"].map((group) => (
                      <section key={group} aria-label={group} className="flex flex-col gap-1">
                        <h3 className="font-sans text-etiqueta font-medium text-texto-2">{group}</h3>
                        <ul className="flex flex-col divide-y divide-borde">
                          {METRICS.filter((metric) => metric.group === group).map((metric) => {
                            const item = result.items.find((entry) => entry.key === metric.key);
                            if (!item) return null;
                            return (
                              <li key={metric.key} className="flex items-start gap-2.5 py-2">
                                <span aria-label={LIGHT_LABEL[item.light]} className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[item.light])} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span className="flex items-baseline justify-between gap-2 text-interfaz">
                                    <span>{metric.label}</span>
                                    <span className="cifras">{format(item.value, metric.unit)}</span>
                                  </span>
                                  <span className="text-nota text-texto-2">
                                    {item.reason} {item.peerMedian !== null ? `Mediana: ${format(item.peerMedian, metric.unit)}.` : ""} {metric.help}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {file.data ? (
        <p className="text-nota text-texto-2">
          Datos de {file.data.fuente}, actualizados {formatAge(file.data.generadoEn)}. El semáforo compara con la mediana de sus pares
          (±10%) y marca alertas fijas: liquidez menor a 1, reparto mayor a 100% o pérdidas. Es una guía para hacer preguntas, no
          una recomendación.
        </p>
      ) : null}
      <EducationalNotice />
    </>
  );
}
