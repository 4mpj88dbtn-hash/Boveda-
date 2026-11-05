"use client";

import { Button } from "@/components/ui/button";

/** Recarga la página que intentaste abrir (el service worker la sirve sin conexión). */
export function RetryButton() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      Volver a intentar
    </Button>
  );
}
