"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finanzas", label: "Movimientos" },
  { href: "/finanzas/resumenes", label: "Resúmenes" },
  { href: "/finanzas/presupuestos", label: "Presupuestos" },
  { href: "/finanzas/cuentas", label: "Cuentas" },
  { href: "/finanzas/recurrentes", label: "Recurrentes" },
  { href: "/finanzas/categorias", label: "Categorías" },
] as const;

/** Encabezado de Finanzas con sus tres pantallas. */
export function FinanceHeader() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-display lg:text-display-lg">Finanzas</h1>
      <nav aria-label="Finanzas" className="-mx-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-full px-4 text-interfaz font-medium transition-colors duration-120 ease-boveda",
                active ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
