import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Superficie para agrupar información. Se distingue por tono y borde, sin sombras. */
export function Panel({
  title,
  action,
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & { title?: string; action?: ReactNode }) {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 lg:p-5", className)}
      {...props}
    >
      {title ? (
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-titulo lg:text-titulo-lg">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
