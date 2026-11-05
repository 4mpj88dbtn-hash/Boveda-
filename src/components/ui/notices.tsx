import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Aviso obligatorio en todo contenido de inversión, mercados y trading. */
export function EducationalNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-nota text-texto-2", className)}>Información educativa. No es asesoría financiera.</p>
  );
}

/** Estado vacío: dice qué va a aparecer aquí y qué hacer, sin disculparse. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <p className="text-interfaz font-medium text-texto">{title}</p>
      <p className="max-w-[60ch] text-etiqueta text-texto-2">{description}</p>
      {action}
    </div>
  );
}

/** Indica en qué fase del proyecto llega una sección. */
export function PhaseTag({ phase }: { phase: number }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-borde-control px-2.5 text-nota font-medium text-texto-2">
      Fase {phase}
    </span>
  );
}
