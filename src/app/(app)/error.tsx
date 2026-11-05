"use client";

import { Button } from "@/components/ui/button";

/** Si una pantalla falla al cargar, lo dice y ofrece reintentar. El resto de la app sigue. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-superficie p-5">
      <h1 className="text-titulo">Esta pantalla no cargó</h1>
      <p className="text-interfaz text-texto-2">
        Puede ser la conexión o el servidor. Tus datos guardados no se perdieron. Intenta de nuevo.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </section>
  );
}
