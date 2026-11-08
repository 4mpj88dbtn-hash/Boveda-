"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/senales", label: "Avisos" },
  { href: "/senales/noticias", label: "Noticias" },
  { href: "/senales/calendario", label: "Calendario" },
] as const;

/** Encabezado de Señales con sus tres pantallas. */
export function SignalsHeader() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-display lg:text-display-lg">Señales</h1>
      <nav aria-label="Señales" className="-mx-1 flex gap-1 overflow-x-auto">
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
    </header>
  );
}

const PRIORITY_STYLE = {
  critica: "border-negativo-texto text-negativo-texto",
  importante: "border-laton text-laton",
  informativa: "border-borde-control text-texto-2",
} as const;

export function PriorityTag({ priority }: { priority: keyof typeof PRIORITY_STYLE }) {
  const label = priority === "critica" ? "Crítica" : priority === "importante" ? "Importante" : "Informativa";
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-nota font-medium", PRIORITY_STYLE[priority])}>
      {label}
    </span>
  );
}
