"use client";

import { Plus, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botón "+" para registrar un movimiento. En la Fase 0 abre una hoja que explica lo que
 * viene; en la Fase 1 aquí vive el registro rápido (monto → categoría → guardar).
 */
export function QuickAdd({ variant }: { variant: "barra" | "lateral" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      {variant === "barra" ? (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-label="Registrar movimiento"
          className="-mt-6 grid size-14 place-items-center rounded-full bg-laton text-sobre-laton shadow-flotante transition-[filter,transform] duration-120 ease-boveda hover:brightness-110 active:scale-95"
        >
          <Plus aria-hidden className="size-7" strokeWidth={2} />
        </button>
      ) : (
        <Button onClick={() => dialogRef.current?.showModal()} className="w-full">
          <Plus aria-hidden className="size-5" />
          Registrar
        </Button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="registro-titulo"
        className={cn(
          "m-0 mt-auto w-full max-w-none rounded-t-hoja border border-borde bg-elevada p-0 text-texto shadow-flotante",
          "backdrop:bg-fondo/70 lg:m-auto lg:max-w-md lg:rounded-hoja",
        )}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="flex flex-col gap-4 px-[max(16px,env(safe-area-inset-left))] pb-[max(24px,env(safe-area-inset-bottom))] pt-5 lg:px-6">
          <header className="flex items-start justify-between gap-4">
            <h2 id="registro-titulo" className="text-titulo">
              Registro rápido
            </h2>
            <form method="dialog">
              <Button type="submit" variant="fantasma" size="icono" aria-label="Cerrar">
                <X aria-hidden className="size-5" />
              </Button>
            </form>
          </header>
          <p className="text-interfaz text-texto-2">
            En la Fase 1 aquí registrarás un gasto o un ingreso en 3 toques: monto, categoría y guardar.
            La fecha de hoy se pone sola.
          </p>
          <form method="dialog">
            <Button type="submit" variant="secundario" className="w-full">
              Entendido
            </Button>
          </form>
        </div>
      </dialog>
    </>
  );
}
