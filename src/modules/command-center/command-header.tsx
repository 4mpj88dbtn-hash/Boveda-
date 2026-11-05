"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";
import { LOAD_SEQUENCE_ATTRIBUTE, LOAD_SEQUENCE_KEY } from "./load-sequence";

type CommandHeaderProps = {
  /** Patrimonio neto en centavos, o null si todavía no hay cuentas. */
  netWorthCents: number | null;
  /** Cambio del mes en centavos. */
  monthChangeCents?: number;
};

/**
 * El elemento memorable de Bóveda: el patrimonio neto en serif grande sobre una retícula
 * técnica tenue. La retícula se ilumina alrededor del cursor o del dedo. Al abrir la app,
 * se enciende una sola vez por sesión. Con "reducir movimiento" queda estática.
 */
export function CommandHeader({ netWorthCents, monthChangeCents }: CommandHeaderProps) {
  const ref = useRef<HTMLElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Marca la secuencia como vista al terminar, para no repetirla en esta sesión.
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(LOAD_SEQUENCE_KEY, "1");
      } catch {
        // Sin almacenamiento disponible no pasa nada.
      }
      document.documentElement.setAttribute(LOAD_SEQUENCE_ATTRIBUTE, "");
    }, 800);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer.current);
    };
  }, []);

  function track(event: PointerEvent<HTMLElement>, hideAfter?: number) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--y", `${event.clientY - rect.top}px`);
    setActive(true);
    clearTimeout(hideTimer.current);
    if (hideAfter) hideTimer.current = setTimeout(() => setActive(false), hideAfter);
  }

  const hasData = netWorthCents !== null;

  return (
    <section
      ref={ref}
      aria-labelledby="patrimonio-titulo"
      onPointerMove={(event) => track(event, event.pointerType === "mouse" ? undefined : 900)}
      onPointerDown={(event) => track(event, 1200)}
      onPointerLeave={() => setActive(false)}
      className="relative isolate touch-pan-y overflow-hidden rounded-tarjeta border border-borde bg-superficie px-5 pb-6 pt-7 lg:px-8 lg:pb-8 lg:pt-10"
    >
      <div aria-hidden className="reticula primera-carga:animate-encender-reticula absolute inset-0 -z-10" />
      <div
        aria-hidden
        className={cn(
          "reticula-viva absolute inset-0 -z-10 opacity-0 transition-opacity duration-200 ease-boveda",
          active && "opacity-100",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "mira pointer-events-none absolute left-(--x) top-(--y) -z-10 size-11 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 ease-boveda",
          active && "opacity-100",
        )}
      />

      <h2 id="patrimonio-titulo" className="font-sans text-etiqueta font-medium text-texto-2">
        Patrimonio neto
      </h2>
      <p className="primera-carga:animate-enfocar-cifra mt-2 font-serif text-hero font-semibold lg:text-hero-lg">
        <Amount cents={netWorthCents ?? 0} tone={hasData ? "neutro" : "apagado"} />
      </p>
      {hasData ? (
        <p className="mt-3 text-interfaz text-texto-2">
          <Amount cents={monthChangeCents ?? 0} tone="variacion" /> este mes
        </p>
      ) : (
        <p className="mt-3 max-w-[48ch] text-interfaz text-texto-2">
          Aún no hay cuentas registradas. Cuando las agregues en la Fase 1, aquí verás tu patrimonio
          neto: lo que tienes menos lo que debes.
        </p>
      )}
    </section>
  );
}
