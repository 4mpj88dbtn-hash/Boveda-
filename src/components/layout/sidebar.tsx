"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV, isActive, type NavItem } from "./nav-items";
import { QuickAdd } from "./quick-add";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-control px-3 text-interfaz font-medium transition-colors duration-120",
        active ? "bg-elevada text-texto" : "text-texto-2 hover:bg-elevada hover:text-texto",
      )}
    >
      <Icon aria-hidden className={cn("size-5", active && "text-laton")} strokeWidth={active ? 2 : 1.6} />
      {item.label}
    </Link>
  );
}

/** Barra lateral de escritorio. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-borde bg-superficie px-3 py-6 lg:flex">
      <Link href="/" className="px-3 font-serif text-titulo-lg font-semibold text-laton">
        Bóveda
      </Link>
      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <hr className="mx-3 border-borde" />
      <nav aria-label="Más" className="flex flex-col gap-1">
        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="mt-auto px-3">
        <QuickAdd variant="lateral" />
      </div>
    </aside>
  );
}
