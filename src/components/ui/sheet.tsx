"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type SheetProps = {
  title: string;
  /** Se llama cuando el usuario la cierra (X, Esc o tocando fuera). */
  onClose: () => void;
  children: ReactNode;
  /** Parte fija de abajo (teclado, botón de guardar). */
  footer?: ReactNode;
  /** Botones extra junto a la X. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Hoja que sube desde abajo en el celular y aparece al centro en la computadora.
 * Existe mientras está montada: para cerrarla desde el código, deja de mostrarla.
 */
export function Sheet({ title, onClose, children, footer, actions, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // En desarrollo React monta dos veces: un cierre viejo llega con la hoja ya abierta.
        if (!ref.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close();
      }}
      className={cn(
        "m-0 mt-auto max-h-[calc(100dvh-max(12px,env(safe-area-inset-top)))] w-full max-w-none flex-col overflow-hidden rounded-t-hoja border border-borde bg-elevada p-0 text-texto shadow-flotante open:flex",
        "backdrop:bg-fondo/70 lg:m-auto lg:max-h-[88dvh] lg:max-w-md lg:rounded-hoja",
        "transition-[opacity,translate] duration-200 ease-boveda starting:open:translate-y-6 starting:open:opacity-0",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 py-1 pl-4 pr-2 lg:pl-6">
        <h2 id={titleId} className="text-titulo">
          {title}
        </h2>
        <div className="flex items-center">
          {actions}
          <Button variant="fantasma" size="icono" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <X aria-hidden className="size-5" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 lg:px-6">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-borde px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 lg:px-6">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
