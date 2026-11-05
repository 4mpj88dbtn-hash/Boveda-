"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { eraseAllData } from "./erase-all";

const CONFIRM_WORD = "borrar";

/** Confirmación para borrar todos los datos del dispositivo: hay que escribir "borrar". */
export function EraseDialog({
  open,
  onClose,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="borrar-titulo"
      onClose={() => {
        setTyped("");
        onClose();
      }}
      className="m-auto w-[min(100%-32px,28rem)] rounded-hoja border border-borde bg-elevada p-0 text-texto shadow-flotante backdrop:bg-fondo/80"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (typed.trim().toLowerCase() !== CONFIRM_WORD) return;
          setErasing(true);
          void eraseAllData();
        }}
      >
        <h2 id="borrar-titulo" className="text-titulo">
          {title}
        </h2>
        <p className="text-interfaz text-texto-2">{description}</p>
        <Field id="confirmar-borrado" label={`Escribe “${CONFIRM_WORD}” para confirmar`}>
          <Input
            id="confirmar-borrado"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoCapitalize="none"
            autoComplete="off"
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            variant="peligro"
            disabled={erasing || typed.trim().toLowerCase() !== CONFIRM_WORD}
          >
            {erasing ? "Borrando…" : "Borrar todo y empezar de nuevo"}
          </Button>
          <Button type="button" variant="secundario" onClick={() => ref.current?.close()}>
            Cancelar
          </Button>
        </div>
      </form>
    </dialog>
  );
}
