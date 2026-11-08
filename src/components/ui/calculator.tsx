import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Field, Input } from "./field";

/** Piezas comunes de las calculadoras (Inversión y Trading). */

/** Lee un número escrito con comas de miles; vacío o inválido = NaN. */
export const num = (text: string) => Number(text.replace(/,/g, "").trim() || "NaN");

export function NumberInput({ id, label, value, onChange, suffix }: { id: string; label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <Field id={id} label={suffix ? `${label} (${suffix})` : label}>
      <Input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function Result({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-interfaz text-texto-2">{label}</dt>
      <dd className={cn("cifras text-right", strong ? "font-serif text-cifra font-semibold" : "text-interfaz")}>{value}</dd>
    </div>
  );
}

export function Explain({ formula, children }: { formula: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-control bg-fondo p-3">
      <code className="overflow-x-auto whitespace-pre font-mono text-nota text-laton">{formula}</code>
      <p className="text-etiqueta text-texto-2">{children}</p>
    </div>
  );
}
