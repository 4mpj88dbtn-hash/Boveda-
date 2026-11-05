"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createPinRecord, pinProblem, verifyPin } from "@/lib/lock/pin";
import { getSetting, setSetting } from "@/lib/settings";
import { PinPad } from "@/modules/lock/pin-pad";

type Step =
  | { kind: "actual"; message?: string }
  | { kind: "nuevo"; message?: string }
  | { kind: "confirmar"; pin: string }
  | { kind: "guardando" };

/** Cambiar el PIN: pide el actual, el nuevo y la confirmación. */
export function ChangePinDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ kind: "actual" });
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function fail(next: Step) {
    setErrors((count) => count + 1);
    setStep(next);
  }

  async function checkCurrent(pin: string) {
    const record = await getSetting("pin");
    if (!record || !(await verifyPin(pin, record))) {
      fail({ kind: "actual", message: "Ese no es tu PIN actual." });
      return;
    }
    setStep({ kind: "nuevo" });
  }

  async function save(pin: string) {
    setStep({ kind: "guardando" });
    await setSetting("pin", await createPinRecord(pin));
    onChanged();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      aria-label="Cambiar PIN"
      onClose={() => {
        setStep({ kind: "actual" });
        onClose();
      }}
      className="m-auto w-[min(100%-32px,26rem)] rounded-hoja border border-borde bg-elevada p-0 text-texto shadow-flotante backdrop:bg-fondo/80"
    >
      <div className="flex flex-col items-center gap-4 p-5">
        {step.kind === "actual" ? (
          <PinPad title="PIN actual" message={step.message} errorCount={errors} onComplete={(pin) => void checkCurrent(pin)} />
        ) : null}
        {step.kind === "nuevo" ? (
          <PinPad
            title="PIN nuevo"
            description="6 dígitos que no sean fáciles de adivinar."
            message={step.message}
            errorCount={errors}
            onComplete={(pin) => {
              const problem = pinProblem(pin);
              if (problem) fail({ kind: "nuevo", message: problem });
              else setStep({ kind: "confirmar", pin });
            }}
          />
        ) : null}
        {step.kind === "confirmar" ? (
          <PinPad
            title="Confirma el PIN nuevo"
            onComplete={(pin) => {
              if (pin !== step.pin) fail({ kind: "nuevo", message: "Los PIN no coinciden. Escribe el nuevo otra vez." });
              else void save(pin);
            }}
          />
        ) : null}
        {step.kind === "guardando" ? (
          <p role="status" className="text-interfaz text-texto-2">
            Guardando tu PIN nuevo…
          </p>
        ) : null}
        <Button variant="secundario" className="w-full" onClick={() => ref.current?.close()}>
          Cancelar
        </Button>
      </div>
    </dialog>
  );
}
