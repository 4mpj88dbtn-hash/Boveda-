"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAIN_NAV, isActive, type NavItem } from "./nav-items";
import { QuickAdd } from "./quick-add";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-control px-0.5 text-nota font-medium transition-colors duration-120",
        active ? "text-laton" : "text-texto-2 hover:text-texto",
      )}
    >
      <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
      <span className="max-w-full truncate tracking-[-0.01em]">{item.shortLabel}</span>
    </Link>
  );
}

/** Barra inferior del celular: 5 secciones y el botón "+" para registrar. */
export function BottomNav() {
  const pathname = usePathname();
  const [first, second, ...rest] = MAIN_NAV;

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie/95 backdrop-blur-sm lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center px-[max(4px,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)]">
        {first ? <NavLink item={first} pathname={pathname} /> : null}
        {second ? <NavLink item={second} pathname={pathname} /> : null}
        <div className="flex flex-1 justify-center">
          <QuickAdd variant="barra" />
        </div>
        {rest.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
