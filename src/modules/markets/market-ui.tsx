"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_TIME_ZONE, todayInCancun } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requiredKey, type Asset } from "./catalog";
import { formatChange, formatQuote, quoteChange } from "./lib/format";
import { nyseStatus, type MarketStatus } from "./lib/market-hours";
import type { Quote } from "./lib/schema";

const TIME = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const DAY = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, weekday: "short", day: "2-digit", month: "2-digit" });

/** "hoy 15:00" o "vie 06/11 15:00", en hora de Cancún. */
export function formatDataTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay = todayInCancun(date) === todayInCancun(now);
  return `${sameDay ? "hoy" : DAY.format(date).replace(".", "").replace(",", "")} ${TIME.format(date)}`;
}

/** Hace cuánto: "hace 12 min", "hace 3 h", "hace 2 días". */
export function formatAge(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={cn("h-8", className)} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => `${((index / (values.length - 1)) * 100).toFixed(2)},${(28 - ((value - min) / span) * 26).toFixed(2)}`)
    .join(" ");
  const up = (values.at(-1) ?? 0) >= (values[0] ?? 0);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)} aria-hidden>
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={up ? "stroke-positivo" : "stroke-negativo-texto"}
      />
    </svg>
  );
}

/** Tarjeta de un activo: precio, cambio del día, mini gráfica, fuente y hora. */
export function QuoteCard({ asset, quote }: { asset: Asset; quote: Quote | undefined }) {
  const change = quote ? quoteChange(quote.precio, quote.cierreAnterior) : null;
  const tone = change ? (change.absolute > 0 ? "text-positivo" : change.absolute < 0 ? "text-negativo-texto" : "text-texto-2") : "text-texto-2";
  const missingKey = requiredKey(asset);
  return (
    <Link
      href={`/mercados/${asset.id}`}
      className="flex min-w-0 flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-3 transition-colors duration-120 ease-boveda hover:bg-elevada"
    >
      <span className="truncate text-etiqueta text-texto-2">{asset.nombre}</span>
      {quote ? (
        <>
          <span className="cifras truncate font-serif text-cifra font-semibold">{formatQuote(quote.precio, asset.unidad)}</span>
          <span className={cn("cifras truncate text-etiqueta", tone)}>
            {change ? formatChange(change, asset.unidad, quote.precio) : "Sin cambio del día"}
          </span>
          <Sparkline values={quote.mini} />
          <span className="truncate text-nota text-texto-2">
            {quote.estado === "anterior" ? "Último dato: " : ""}
            {quote.fechaDato ? `dato del ${quote.fechaDato.split("-").reverse().join("/")}` : quote.hora ? formatDataTime(quote.hora) : ""}
            {" · "}
            {quote.fuente}
          </span>
        </>
      ) : (
        <span className="text-etiqueta text-texto-2">
          {missingKey ? "Falta su clave gratuita (ver abajo)." : "Sin dato todavía."}
        </span>
      )}
    </Link>
  );
}

/** "Abierto. Cierra hoy a las 15:00." o "Cerrado (fin de semana). Abre el lun 09/11 a las 08:30.", en hora de Cancún. */
export function statusText(status: MarketStatus): string {
  const at = TIME.format(status.nextChange);
  const day = DAY.format(status.nextChange).replace(".", "").replace(",", "");
  const sameDay = todayInCancun(status.nextChange) === todayInCancun();
  const when = sameDay ? `hoy a las ${at}` : `el ${day} a las ${at}`;
  switch (status.state) {
    case "abierto":
      return `Abierto. Cierra ${when}${status.earlyClose ? " (cierre anticipado)" : ""}.`;
    case "preapertura":
      return `Pre-apertura. Abre ${when}.`;
    case "postcierre":
      return `Cerrado (operaciones después del cierre). Abre ${when}.`;
    case "cerrado":
      return `Cerrado${status.holidayName ? ` por ${status.holidayName}` : status.reason === "fin de semana" ? " (fin de semana)" : ""}. Abre ${when}.`;
  }
}

/** Estado de la Bolsa de Nueva York en hora de Cancún; se actualiza cada minuto. */
export function MarketStatusLine({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  if (!now) return <p className={cn("h-5", className)} />;
  const status = nyseStatus(now);
  return (
    <p className={cn("flex items-center gap-2 text-interfaz", className)}>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", status.state === "abierto" ? "bg-positivo" : status.state === "cerrado" ? "bg-borde-control" : "bg-laton")}
      />
      <span>
        <span className="font-medium">Bolsa de Nueva York:</span> {statusText(status)}{" "}
        <span className="text-texto-2">(hora de Cancún)</span>
      </span>
    </p>
  );
}
