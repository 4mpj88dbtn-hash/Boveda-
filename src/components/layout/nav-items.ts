import {
  Bell,
  ChartCandlestick,
  ChartLine,
  Gauge,
  Settings,
  TrendingUp,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: "/" | "/finanzas" | "/mercados" | "/inversion" | "/trading" | "/senales" | "/boveda" | "/ajustes";
  /** Nombre completo (barra lateral). */
  label: string;
  /** Nombre corto para la barra inferior del celular. */
  shortLabel: string;
  icon: LucideIcon;
};

/** Las 5 secciones principales, en el orden de la barra inferior. */
export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Centro de mando", shortLabel: "Mando", icon: Gauge },
  { href: "/finanzas", label: "Finanzas", shortLabel: "Finanzas", icon: Wallet },
  { href: "/mercados", label: "Mercados", shortLabel: "Mercados", icon: ChartLine },
  { href: "/inversion", label: "Inversión", shortLabel: "Inversión", icon: TrendingUp },
  { href: "/trading", label: "Trading", shortLabel: "Trading", icon: ChartCandlestick },
];

/** Secciones de apoyo (barra lateral en escritorio; íconos arriba en el celular). */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/senales", label: "Señales", shortLabel: "Señales", icon: Bell },
  { href: "/boveda", label: "La Bóveda", shortLabel: "Bóveda", icon: Vault },
  { href: "/ajustes", label: "Ajustes", shortLabel: "Ajustes", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
