"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shouldLock, type LockPolicy } from "@/lib/lock/policy";
import { useSetting } from "@/lib/settings";
import { markActive, readLastActive } from "./activity";
import { SetupScreen } from "./setup-screen";
import { UnlockScreen } from "./unlock-screen";

type LockContextValue = { lockNow: () => void };
const LockContext = createContext<LockContextValue | null>(null);

/** Para bloquear la app desde cualquier pantalla (por ejemplo, Ajustes → Bloquear ahora). */
export function useLock(): LockContextValue {
  const value = use(LockContext);
  if (!value) throw new Error("useLock debe usarse dentro de LockGate");
  return value;
}

// Distingue el primer arranque de la app en esta carga de página de los regresos desde otra app.
let coldStartPending = true;

type GateState = "revisando" | "abierta" | "bloqueada";

/**
 * Protege la app con el PIN. Mientras no esté abierta no se muestra ningún dato.
 * La primera vez lleva a configurar el nombre y el PIN.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const pin = useSetting("pin");
  const policySetting = useSetting("lockPolicy");
  const policy: LockPolicy = policySetting?.value ?? "siempre";
  const [state, setState] = useState<GateState>("revisando");
  // Evita volver a mostrar la configuración mientras la base termina de guardar el PIN nuevo.
  const [configured, setConfigured] = useState(false);
  const decided = useRef(false);

  // Decide al arrancar si hay que pedir el PIN.
  useEffect(() => {
    if (pin === undefined || policySetting === undefined || decided.current) return;
    decided.current = true;
    if (!pin.value) return; // Sin PIN todavía: se muestra la configuración inicial.
    const coldStart = coldStartPending;
    coldStartPending = false;
    const locked = shouldLock({ policy, lastActiveAt: readLastActive(), now: Date.now(), coldStart });
    // Se decide una sola vez por carga, con datos que solo existen en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(locked ? "bloqueada" : "abierta");
  }, [pin, policySetting, policy]);

  // Al volver de otra app, revisa si pasó demasiado tiempo.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (state === "abierta") markActive();
        return;
      }
      if (state === "abierta" && shouldLock({ policy, lastActiveAt: readLastActive(), now: Date.now(), coldStart: false })) {
        setState("bloqueada");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [policy, state]);

  // Mientras está abierta, registra que se está usando.
  useEffect(() => {
    if (state !== "abierta") return;
    markActive();
    const timer = setInterval(() => markActive(), 30_000);
    return () => clearInterval(timer);
  }, [state]);

  const lockNow = useCallback(() => setState("bloqueada"), []);
  const unlock = useCallback(() => {
    markActive();
    setState("abierta");
  }, []);
  const finishSetup = useCallback(() => {
    setConfigured(true);
    unlock();
  }, [unlock]);
  const context = useMemo(() => ({ lockNow }), [lockNow]);

  if (pin === undefined || policySetting === undefined) return <Splash />;
  if (!pin.value && !configured) return <SetupScreen onDone={finishSetup} />;
  if (state === "revisando") return <Splash />;
  if (state === "bloqueada") {
    return pin.value ? <UnlockScreen pin={pin.value} onUnlock={unlock} /> : <SetupScreen onDone={finishSetup} />;
  }
  return <LockContext value={context}>{children}</LockContext>;
}

function Splash() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <p className="font-serif text-titulo font-semibold text-laton">Bóveda</p>
    </main>
  );
}
