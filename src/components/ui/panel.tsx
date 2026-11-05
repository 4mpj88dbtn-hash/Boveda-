import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** "Este mes" → "panel-este-mes": enlaza la sección con su título para lectores de pantalla. */
function panelId(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `panel-${slug}`;
}

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
      aria-labelledby={title ? panelId(title) : undefined}
      className={cn("flex min-w-0 flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 lg:p-5", className)}
      {...props}
    >
      {title ? (
        <header className="flex items-baseline justify-between gap-3">
          <h2 id={panelId(title)} className="text-titulo lg:text-titulo-lg">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
