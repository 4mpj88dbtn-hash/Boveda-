"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "./button";

/**
 * Aviso breve abajo de la pantalla ("Gasto guardado", con "Deshacer"). Solo uno a la vez;
 * se va solo a los 6 segundos.
 */

type ToastData = { id: number; message: string; action?: { label: string; run: () => unknown } };

let current: ToastData | null = null;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(toast: Omit<ToastData, "id">): void {
  counter += 1;
  current = { ...toast, id: counter };
  emit();
}

export function dismissToast(): void {
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function Toaster() {
  const toast = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Al bloquear la app el aviso desaparece con todo lo demás.
  useEffect(() => dismissToast, []);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-6 lg:left-[248px]"
    >
      {toast ? (
        <div
          key={toast.id}
          className="pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-tarjeta border border-borde bg-elevada py-1.5 pl-4 pr-1.5 shadow-flotante transition-[opacity,translate] duration-200 ease-boveda starting:translate-y-2 starting:opacity-0"
        >
          <p className="min-w-0 flex-1 text-interfaz">{toast.message}</p>
          {toast.action ? (
            <Button
              variant="fantasma"
              className="text-laton"
              onClick={() => {
                const { run } = toast.action ?? {};
                dismissToast();
                void run?.();
              }}
            >
              {toast.action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
