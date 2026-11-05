"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/base-path";

/** Registra el service worker (solo en producción): instala la app y la abre sin internet. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(withBasePath("/sw.js"), { scope: withBasePath("/"), updateViaCache: "none" })
      .catch(() => {
        // Sin service worker la app funciona igual; solo no abre sin internet.
      });
  }, []);
  return null;
}
