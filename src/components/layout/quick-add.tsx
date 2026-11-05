"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openTransactionSheet } from "@/modules/finance/sheet-store";

/** Botón "+" para registrar un movimiento: abre el registro rápido (monto → categoría → guardar). */
export function QuickAdd({ variant }: { variant: "barra" | "lateral" }) {
  const open = () => openTransactionSheet({ kind: "nuevo" });

  if (variant === "barra") {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Registrar movimiento"
        className="-mt-6 grid size-14 place-items-center rounded-full bg-laton text-sobre-laton shadow-flotante transition-[filter,transform] duration-120 ease-boveda hover:brightness-110 active:scale-95"
      >
        <Plus aria-hidden className="size-7" strokeWidth={2} />
      </button>
    );
  }

  return (
    <Button onClick={open} className="w-full">
      <Plus aria-hidden className="size-5" />
      Registrar
    </Button>
  );
}
