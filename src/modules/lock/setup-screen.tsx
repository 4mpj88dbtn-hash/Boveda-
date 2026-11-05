"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPersistentStorage } from "@/lib/db";
import { createPinRecord, pinProblem } from "@/lib/lock/pin";
import { setSetting } from "@/lib/settings";
import { PinPad } from "./pin-pad";

type Step = { kind: "nombre" } | { kind: "crear"; message?: string } | { kind: "confirmar"; pin: string } | { kind: "guardando" };

/** Primera vez: nombre para el saludo (opcional) y PIN de 6 dígitos. */
export function SetupScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "nombre" });
  const [name, setName] = useState("");
  const [errors, setErrors] = useState(0);

  async function save(pin: string) {
    setStep({ kind: "guardando" });
    const record = await createPinRecord(pin);
    await setSetting("pin", record);
    await setSetting("lockPolicy", "siempre");
    await setSetting("createdAt", Date.now());
    if (name.trim()) await setSetting("displayName", name.trim());
    await requestPersistentStorage();
    onDone();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-[max(16px,env(safe-area-inset-left))] py-10">
      <p className="text-center font-serif text-titulo font-semibold text-laton">Bóveda</p>

      {step.kind === "nombre" ? (
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setStep({ kind: "crear" });
          }}
        >
          <header className="flex flex-col gap-2">
            <h1 className="text-display">Bienvenido</h1>
            <p className="text-interfaz text-texto-2">
              Tus datos se guardan solo en este dispositivo y se protegen con un PIN de 6 dígitos. Nada
              sale de tu celular.
            </p>
          </header>
          <Field id="nombre" label="¿Cómo quieres que te salude? (opcional)" hint="Por ejemplo: “Buenas noches, Ana”.">
            <Input
              id="nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoComplete="given-name"
              aria-describedby="nombre-ayuda"
            />
          </Field>
          <Button type="submit" size="lg">
            Continuar
          </Button>
        </form>
      ) : null}

      {step.kind === "crear" ? (
        <PinPad
          title="Crea tu PIN"
          description="6 dígitos que solo tú sepas. La app te lo pedirá al abrirla."
          message={step.message}
          errorCount={errors}
          onComplete={(pin) => {
            const problem = pinProblem(pin);
            if (problem) {
              setErrors((count) => count + 1);
              setStep({ kind: "crear", message: problem });
              return;
            }
            setStep({ kind: "confirmar", pin });
          }}
        />
      ) : null}

      {step.kind === "confirmar" ? (
        <PinPad
          title="Confirma tu PIN"
          description="Escríbelo otra vez."
          onComplete={(pin) => {
            if (pin !== step.pin) {
              setErrors((count) => count + 1);
              setStep({ kind: "crear", message: "Los PIN no coinciden. Créalo de nuevo." });
              return;
            }
            void save(pin);
          }}
        />
      ) : null}

      {step.kind === "guardando" ? (
        <p role="status" className="text-center text-interfaz text-texto-2">
          Protegiendo tu PIN…
        </p>
      ) : null}
    </main>
  );
}
