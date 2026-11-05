"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción) para instalar la app y abrir sin conexión. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sin service worker la app funciona igual; solo no abre sin conexión.
    });
  }, []);
  return null;
}
