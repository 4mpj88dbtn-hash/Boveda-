"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { APP_TIME_ZONE, formatDayHeading, todayInCancun } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { formatAge } from "@/modules/markets/market-ui";
import { useCalendarFile } from "./data";
import type { CalendarEvent } from "./lib/schema";

const TIME = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

const COUNTRIES = ["Todos", "EE. UU.", "México"] as const;

/** Calendario económico de fuentes oficiales, en hora de Cancún. */
export function CalendarView() {
  const calendar = useCalendarFile();
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>("Todos");
  const [now] = useState(() => new Date());
  const today = todayInCancun(now);
  const events = (calendar.data?.eventos ?? []).filter(
    (event) => (country === "Todos" || event.pais === country) && Date.parse(event.fecha) >= now.getTime() - 3 * 3_600_000,
  );

  const days = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = todayInCancun(new Date(event.fecha));
    days.set(day, [...(days.get(day) ?? []), event]);
  }
  const missing = calendar.data?.fuentes.filter((source) => source.estado === "error").map((source) => source.nombre) ?? [];
  const hasFred = calendar.data?.fuentes.some((source) => source.nombre === "FRED");

  return (
    <>
      <div role="group" aria-label="País" className="flex gap-1">
        {COUNTRIES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={country === option}
            onClick={() => setCountry(option)}
            className={cn(
              "h-11 rounded-full border px-4 text-etiqueta font-medium transition-colors duration-120 ease-boveda",
              country === option ? "border-laton text-texto" : "border-borde text-texto-2 hover:text-texto",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {calendar.status === "cargando" && !calendar.data ? <p className="text-interfaz text-texto-2">Cargando calendario…</p> : null}
      {calendar.data && days.size === 0 ? (
        <EmptyState
          title="Sin eventos próximos con ese filtro"
          description={country === "México" ? "Las decisiones de Banxico están en su calendario oficial (enlace abajo)." : "Cambia el filtro."}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {[...days].map(([day, list]) => (
            <section key={day} aria-label={formatDayHeading(day, today)} className="flex flex-col gap-1">
              <h2 className="font-sans text-etiqueta font-medium text-texto-2 first-letter:uppercase">{formatDayHeading(day, today)}</h2>
              <ul className="flex flex-col divide-y divide-borde rounded-tarjeta border border-borde bg-superficie">
                {list.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-3 py-3">
                    <span className="cifras w-12 shrink-0 text-interfaz text-texto-2">{TIME.format(new Date(event.fecha))}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-interfaz", event.importancia === "alta" && "font-medium")}>{event.titulo}</span>
                      {event.detalle ? <span className="text-etiqueta text-texto-2">{event.detalle}</span> : null}
                      <a
                        href={event.enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 items-center gap-1 self-start text-etiqueta text-laton underline-offset-4 hover:underline"
                      >
                        {event.pais} · Fuente: {event.fuente}
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    </span>
                    {event.importancia === "alta" ? (
                      <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-laton px-2 text-nota font-medium text-laton">
                        Alta
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {calendar.data ? (
        <p className="text-nota text-texto-2">
          Horas en hora de Cancún. Actualizado {formatAge(calendar.data.generadoEn)}. Fuentes oficiales: Reserva Federal (FOMC) y BEA
          (PIB y PCE).{hasFred ? " Inflación y empleo: fechas de FRED." : " Para inflación (CPI) y empleo agrega la clave gratuita FRED_API_KEY."}
          {missing.length > 0 ? ` Sin respuesta en la última revisión: ${missing.join(", ")} (se muestran sus fechas anteriores).` : ""}{" "}
          Las decisiones de Banxico aún no se leen solas: consulta su{" "}
          <a
            href="https://www.banxico.org.mx/viewers2/JSP/calendarioDifusion_es.jsp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-laton underline underline-offset-4"
          >
            calendario oficial
          </a>
          ; sus anuncios llegan a Noticias.
        </p>
      ) : null}
      <EducationalNotice />
    </>
  );
}
