import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-etiqueta font-medium text-texto-2", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        // 16 px evita que el iPhone haga zoom al tocar el campo.
        "h-11 w-full rounded-control border border-borde-control bg-fondo px-3 text-cuerpo text-texto",
        "placeholder:text-texto-2 transition-colors duration-120 ease-boveda",
        "focus-visible:border-laton focus-visible:outline-offset-0",
        "aria-invalid:border-negativo",
        className,
      )}
      {...props}
    />
  );
}

/** Campo con su etiqueta, ayuda y error, ya conectados para lectores de pantalla. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-ayuda`} className="text-nota text-texto-2">
          {hint}
        </p>
      ) : null}
      {error ? <FormMessage id={`${id}-error`}>{error}</FormMessage> : null}
    </div>
  );
}

/** Mensaje de error de un formulario: dice qué pasó y qué hacer. */
export function FormMessage({ className, ...props }: ComponentProps<"p">) {
  return <p role="alert" className={cn("text-etiqueta text-negativo-texto", className)} {...props} />;
}
