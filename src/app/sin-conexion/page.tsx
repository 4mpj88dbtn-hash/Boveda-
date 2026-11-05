import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Sin conexión" };

/** Pantalla que muestra el service worker cuando no hay internet. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-[max(16px,env(safe-area-inset-left))] py-12">
      <p className="font-serif text-titulo font-semibold text-laton">Bóveda</p>
      <WifiOff aria-hidden className="size-8 text-texto-2" strokeWidth={1.6} />
      <div className="flex flex-col gap-2">
        <h1 className="text-display">Sin conexión</h1>
        <p className="text-interfaz text-texto-2">
          Revisa tu internet y vuelve a intentar. Desde la Fase 1 podrás registrar gastos sin conexión y
          se subirán solos cuando vuelva la señal.
        </p>
      </div>
      <RetryButton />
    </main>
  );
}
