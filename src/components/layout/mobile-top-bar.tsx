import { Bell, Settings } from "lucide-react";
import Link from "next/link";

/** Barra superior del celular: marca, Señales y Ajustes. */
export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between lg:hidden">
      <Link href="/" className="font-serif text-titulo font-semibold text-laton">
        Bóveda
      </Link>
      <nav aria-label="Atajos" className="flex items-center gap-1">
        <Link
          href="/senales"
          aria-label="Señales"
          className="grid size-11 place-items-center rounded-control text-texto-2 hover:bg-elevada hover:text-texto"
        >
          <Bell aria-hidden className="size-5" strokeWidth={1.6} />
        </Link>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="grid size-11 place-items-center rounded-control text-texto-2 hover:bg-elevada hover:text-texto"
        >
          <Settings aria-hidden className="size-5" strokeWidth={1.6} />
        </Link>
      </nav>
    </header>
  );
}
