"use client";

import { Delete } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PIN_LENGTH } from "@/lib/lock/pin";
import { cn } from "@/lib/utils";

type PinPadProps = {
  title: string;
  description?: string;
  /** Mensaje de error o de espera; se anuncia a lectores de pantalla. */
  message?: string;
  disabled?: boolean;
  /** Cambia este número para sacudir los puntos tras un error. */
  errorCount?: number;
  onComplete: (pin: string) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "borrar"] as const;

/** Teclado de PIN de 6 dígitos. También funciona con el teclado de la computadora. */
export function PinPad({ title, description, message, disabled, errorCount = 0, onComplete }: PinPadProps) {
  const [digits, setDigits] = useState("");

  const press = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === "borrar") {
        setDigits(digits.slice(0, -1));
        return;
      }
      if (digits.length >= PIN_LENGTH) return;
      const next = digits + key;
      if (next.length === PIN_LENGTH) {
        // Entrega el PIN completo y limpia los puntos para el siguiente intento.
        setDigits("");
        onComplete(next);
      } else {
        setDigits(next);
      }
    },
    [digits, disabled, onComplete],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") press("borrar");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-display">{title}</h1>
        {description ? <p className="max-w-[36ch] text-interfaz text-texto-2">{description}</p> : null}
      </div>

      <div
        key={errorCount}
        aria-hidden
        className={cn("flex gap-3", errorCount > 0 && "animate-sacudir")}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border transition-colors duration-120",
              i < digits.length ? "border-laton bg-laton" : "border-borde-control",
            )}
          />
        ))}
      </div>
      <p role="status" aria-live="polite" className="min-h-[2.6em] max-w-[36ch] text-center text-etiqueta text-negativo-texto">
        {message ?? ""}
        <span className="sr-only">{digits.length > 0 ? `${digits.length} de ${PIN_LENGTH} dígitos` : ""}</span>
      </p>

      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={index} />
          ) : (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === "borrar" ? "Borrar último dígito" : key}
              className={cn(
                "grid size-18 place-items-center rounded-full text-titulo font-medium transition-colors duration-120 ease-boveda disabled:opacity-40",
                key === "borrar"
                  ? "text-texto-2 hover:bg-elevada"
                  : "cifras border border-borde bg-superficie text-texto hover:bg-elevada active:bg-elevada",
              )}
            >
              {key === "borrar" ? <Delete aria-hidden className="size-6" strokeWidth={1.6} /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
