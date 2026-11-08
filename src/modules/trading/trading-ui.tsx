"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { showToast } from "@/components/ui/toast";
import { APP_TIME_ZONE } from "@/lib/dates";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { assetById } from "@/modules/markets/catalog";
import { fetchIntraday, fetchSeries } from "@/modules/markets/data";
import { nyseStatus } from "@/modules/markets/lib/market-hours";
import { statusText } from "@/modules/markets/market-ui";
import { closeTrade, useTrades } from "./data";
import { findExit, mergeBars } from "./lib/exits";
import type { Tradability } from "./simulator";
import { EXIT_REASON_LABELS, type Trade, type TradeAccount } from "./types";

const TABS = [
  { href: "/trading", label: "Simulador" },
  { href: "/trading/diario", label: "Diario" },
  { href: "/trading/estadisticas", label: "Estadísticas" },
  { href: "/trading/calculadoras", label: "Calculadoras" },
  { href: "/trading/plan", label: "Plan" },
  { href: "/trading/revision", label: "Revisión" },
  { href: "/trading/lecciones", label: "Lecciones" },
] as const;

export const ESMA_URL = "https://www.esma.europa.eu/node/84933";

/** Encabezado de Trading: aviso de riesgo, pantallas y revisión de stops y objetivos. */
export function TradingHeader() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-display lg:text-display-lg">Trading</h1>
      <RiskNotice />
      <nav aria-label="Trading" className="-mx-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname === tab.href ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center rounded-full px-4 text-interfaz font-medium transition-colors duration-120 ease-boveda",
              pathname === tab.href ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <ExitWatcher />
    </header>
  );
}

/** Aviso de §5.1: siempre visible en Trading. */
export function RiskNotice() {
  return (
    <aside aria-label="Aviso de riesgo" className="rounded-tarjeta border border-borde-control bg-superficie px-4 py-3 text-etiqueta text-texto-2">
      <p>
        <span className="font-medium text-texto">La mayoría de los traders minoristas pierden dinero.</span> En Europa, entre 74% y 89% de
        las cuentas de pequeños inversionistas que operaban CFD perdían dinero (
        <a href={ESMA_URL} target="_blank" rel="noreferrer" className="text-laton underline underline-offset-4">
          ESMA, 27/03/2018
        </a>
        ). Practica aquí con capital ficticio al menos 2–3 meses con resultados consistentes antes de arriesgar dinero real, y
        usa para trading solo una parte pequeña de tu capital (máximo 5–10%), separada de tu inversión de largo plazo en el S&amp;P
        500.
      </p>
    </aside>
  );
}

/** La hora actual, renovada cada `everyMs`. Es null en el primer dibujo (igual en servidor y navegador). */
export function useNow(everyMs = 60_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [everyMs]);
  return now;
}

const number = (digits: number) => new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: digits });

/** Precio guardado como texto: "USD 612.35" o "$48.10". */
export function formatPrice(text: string, currency: Currency): string {
  const formatted = number(6).format(text as Intl.StringNumericLiteral);
  return currency === "USD" ? `USD ${formatted}` : `$${formatted}`;
}

/** Resultado en R: "+2 R", "−0.5 R" o "0 R". */
export function formatR(r: number): string {
  if (r === 0) return "0 R";
  return `${r > 0 ? "+" : "−"}${Math.abs(r).toLocaleString("es-MX", { maximumFractionDigits: 2 })} R`;
}

/** "títulos" en acciones y ETFs; "unidades" en cripto. */
export function unitsLabel(trade: Pick<Trade, "assetId">): string {
  return trade.assetId && assetById(trade.assetId)?.tipo === "cripto" ? "unidades" : "títulos";
}

/** Títulos: "50" o "0.052". */
export function formatQuantity(text: string): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 8 }).format(text as Intl.StringNumericLiteral);
}

const DATE_TIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "06/11/2026 14:20", en hora de Cancún. */
export function formatInstant(ms: number): string {
  return DATE_TIME.format(new Date(ms)).replace(",", "");
}

/** Por qué no se puede operar ahora, y qué esperar. */
export function tradabilityText(status: Tradability, now: Date): string {
  if (status.ok) return "";
  if (status.reason === "sin-precio") return "Todavía no hay precio publicado de este activo.";
  if (status.reason === "bolsa-cerrada") return `La Bolsa de Nueva York está cerrada. ${statusText(nyseStatus(now)).replace(/^[^.]*\.\s*/, "")}`;
  return `El último precio es de hace ${status.ageMinutes} min; espera la siguiente actualización.`;
}

/** Cambia entre la cuenta del simulador y la de operaciones reales. */
export function AccountSwitch({ value, onChange, counts }: { value: TradeAccount; onChange: (value: TradeAccount) => void; counts?: Record<TradeAccount, number> }) {
  const options: { value: TradeAccount; label: string }[] = [
    { value: "simulador", label: "Simulador" },
    { value: "real", label: "Operaciones reales" },
  ];
  return (
    <div role="group" aria-label="Cuenta" className="flex gap-1 rounded-full border border-borde p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-10 flex-1 items-center justify-center rounded-full px-3 text-interfaz font-medium transition-colors duration-120 ease-boveda",
            value === option.value ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
          )}
        >
          {option.label}
          {counts ? <span className="cifras ml-1.5 text-texto-2">{counts[option.value]}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Fila de definición: etiqueta a la izquierda y valor a la derecha. */
export function Stat({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-interfaz text-texto-2">
        {label}
        {hint ? <span className="block text-nota">{hint}</span> : null}
      </dt>
      <dd className="cifras text-right text-interfaz font-medium">{children}</dd>
    </div>
  );
}

/**
 * Revisa las operaciones abiertas del simulador contra las velas publicadas y cierra las que
 * tocaron su stop o su objetivo, con la hora y el precio en que pasó.
 */
function ExitWatcher() {
  const trades = useTrades();
  const running = useRef(false);
  const signature = trades
    ?.filter((trade) => trade.account === "simulador" && trade.status === "abierta")
    .map((trade) => trade.id)
    .join(",");

  useEffect(() => {
    if (!trades || !signature || running.current) return;
    const open = trades.filter((trade) => trade.account === "simulador" && trade.status === "abierta" && trade.assetId);
    running.current = true;
    void (async () => {
      try {
        for (const trade of open) await checkExit(trade);
      } finally {
        running.current = false;
      }
    })();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || running.current) return;
      running.current = true;
      void (async () => {
        try {
          for (const trade of open) await checkExit(trade);
        } finally {
          running.current = false;
        }
      })();
    }, 5 * 60_000);
    return () => clearInterval(timer);
    // Solo cuando cambia el conjunto de operaciones abiertas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}

async function checkExit(trade: Trade): Promise<void> {
  if (!trade.assetId) return;
  const [intraday, series] = await Promise.all([fetchIntraday(trade.assetId), fetchSeries(trade.assetId)]);
  const bars = mergeBars(series?.diario ?? [], intraday?.cincoDias ?? [], intraday?.unDia ?? []);
  const exit = findExit(trade, bars);
  if (!exit) return;
  const closedNow = await closeTrade(trade.id, exit.price, exit.at, exit.reason);
  if (!closedNow) return;
  showToast({ message: `${trade.symbol}: ${EXIT_REASON_LABELS[exit.reason].toLowerCase()} a ${formatPrice(exit.price, trade.currency)}. Completa tu diario.` });
}
