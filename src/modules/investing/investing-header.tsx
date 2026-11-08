"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/inversion", label: "Portafolio" },
  { href: "/inversion/calculadoras", label: "Calculadoras" },
  { href: "/inversion/simulador", label: "Simulador" },
  { href: "/inversion/guia", label: "Guía" },
  { href: "/inversion/empresas", label: "Empresas" },
] as const;

/** Encabezado de Inversión con sus pantallas. */
export function InvestingHeader() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-display lg:text-display-lg">Inversión</h1>
      <nav aria-label="Inversión" className="-mx-1 flex gap-1 overflow-x-auto">
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
