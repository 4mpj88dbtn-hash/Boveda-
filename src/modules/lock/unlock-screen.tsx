"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyPin, type PinRecord } from "@/lib/lock/pin";
import { attemptsBeforeWait, lockoutRemainingMs } from "@/lib/lock/policy";
import { deleteSetting, setSetting, useSetting } from "@/lib/settings";
import { EraseDialog } from "./erase-dialog";
import { PinPad } from "./pin-pad";

function waitText(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** Pide el PIN para abrir la app. Tras 5 errores obliga a esperar cada vez más. */
export function UnlockScreen({ pin, onUnlock }: { pin: PinRecord; onUnlock: () => void }) {
  const failuresSetting = useSetting("pinFailures");
  const failures = failuresSetting?.value;
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState(0);
  const [eraseOpen, setEraseOpen] = useState(false);

  const waitMs = lockoutRemainingMs(failures, now);

  // Cuenta regresiva mientras hay que esperar.
  useEffect(() => {
    if (waitMs <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitMs]);

  async function check(attempt: string) {
    if (lockoutRemainingMs(failures, Date.now()) > 0) return;
    setChecking(true);
    const ok = await verifyPin(attempt, pin);
    setChecking(false);
    if (ok) {
      await deleteSetting("pinFailures");
      onUnlock();
      return;
    }
    const next = { count: (failures?.count ?? 0) + 1, lastAt: Date.now() };
    await setSetting("pinFailures", next);
    setErrors((count) => count + 1);
    setNow(Date.now());
    const left = attemptsBeforeWait(next);
    setMessage(
      left > 0
        ? `PIN incorrecto. Te ${left === 1 ? "queda 1 intento" : `quedan ${left} intentos`} antes de tener que esperar.`
        : undefined,
    );
  }

  const shownMessage = waitMs > 0 ? `Demasiados intentos. Espera ${waitText(waitMs)} para volver a intentar.` : message;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-[max(16px,env(safe-area-inset-left))] py-10">
      <p className="text-center font-serif text-titulo font-semibold text-laton">Bóveda</p>
      <PinPad
        title="Escribe tu PIN"
        message={checking ? "Revisando…" : shownMessage}
        disabled={checking || waitMs > 0}
        errorCount={errors}
        onComplete={(attempt) => void check(attempt)}
      />
      <Button variant="enlace" className="self-center" onClick={() => setEraseOpen(true)}>
        ¿Olvidaste tu PIN?
      </Button>
      <EraseDialog
        open={eraseOpen}
        onClose={() => setEraseOpen(false)}
        title="¿Olvidaste tu PIN?"
        description="El PIN no se puede recuperar porque solo existe en este dispositivo. Puedes borrar todo y empezar de nuevo; si tienes un respaldo, lo restauras después en Ajustes."
      />
    </main>
  );
}
