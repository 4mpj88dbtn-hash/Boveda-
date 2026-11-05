"use client";

import { HardDrive, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { parseBackup, type BackupFile } from "@/lib/backup";
import { formatDate, todayInCancun } from "@/lib/dates";
import { isStoragePersistent, requestPersistentStorage } from "@/lib/db";
import { LOCK_POLICIES, LOCK_POLICY_LABELS } from "@/lib/lock/policy";
import { deleteSetting, setSetting, useSetting } from "@/lib/settings";
import { EraseDialog } from "@/modules/lock/erase-dialog";
import { useLock } from "@/modules/lock/lock-gate";
import { downloadBackup, restoreBackup } from "./backup-actions";
import { ChangePinDialog } from "./change-pin-dialog";

export function SettingsView() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <GreetingPanel />
      <SecurityPanel />
      <BackupPanel />
      <InstallPanel />
      <DangerPanel />
    </div>
  );
}

function GreetingPanel() {
  const stored = useSetting("displayName");
  const [draft, setDraft] = useState<string>();
  const [saved, setSaved] = useState(false);
  const value = draft ?? stored?.value ?? "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const name = value.trim();
    if (name) await setSetting("displayName", name);
    else await deleteSetting("displayName");
    setDraft(undefined);
    setSaved(true);
  }

  return (
    <Panel title="Saludo">
      <form className="flex flex-col gap-4" onSubmit={save}>
        <Field
          id="displayName"
          label="Tu nombre para el saludo"
          hint="Aparece en el Centro de mando, por ejemplo: “Buenas noches, Ana”. Déjalo vacío si no quieres nombre."
        >
          <Input
            id="displayName"
            value={value}
            maxLength={40}
            autoComplete="given-name"
            aria-describedby="displayName-ayuda"
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit">Guardar nombre</Button>
          <p role="status" className="text-etiqueta text-positivo">
            {saved ? "Nombre guardado." : ""}
          </p>
        </div>
      </form>
    </Panel>
  );
}

function SecurityPanel() {
  const policy = useSetting("lockPolicy")?.value ?? "siempre";
  const { lockNow } = useLock();
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);

  return (
    <Panel title="Seguridad">
      <p className="flex items-start gap-2 text-interfaz">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-positivo" />
        <span>La app está protegida con tu PIN de 6 dígitos.</span>
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-etiqueta font-medium text-texto-2">Pedir el PIN</legend>
        {LOCK_POLICIES.map((option) => (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-borde-control px-3 text-interfaz has-checked:border-laton has-checked:bg-elevada"
          >
            <input
              type="radio"
              name="lockPolicy"
              value={option}
              checked={policy === option}
              onChange={() => void setSetting("lockPolicy", option)}
              className="size-4 accent-laton"
            />
            {LOCK_POLICY_LABELS[option]}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button variant="secundario" onClick={() => setChanging(true)}>
          Cambiar PIN
        </Button>
        <Button variant="secundario" onClick={lockNow}>
          Bloquear ahora
        </Button>
      </div>
      <p role="status" className="text-etiqueta text-positivo">
        {changed ? "PIN cambiado." : ""}
      </p>
      <ChangePinDialog open={changing} onClose={() => setChanging(false)} onChanged={() => setChanged(true)} />
    </Panel>
  );
}

function BackupPanel() {
  const lastBackupAt = useSetting("lastBackupAt")?.value;
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string }>();
  const [pending, setPending] = useState<BackupFile>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void isStoragePersistent().then(setPersistent);
  }, []);

  async function download() {
    const result = await downloadBackup();
    if (result === "cancelado") return;
    setStatus({
      kind: "ok",
      text:
        result === "compartido"
          ? "Respaldo listo. Guárdalo en Archivos, iCloud o Drive."
          : "Respaldo descargado. Guárdalo fuera de este dispositivo.",
    });
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) setStatus({ kind: "error", text: result.error });
    else {
      setStatus(undefined);
      setPending(result.backup);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function confirmRestore() {
    if (!pending) return;
    try {
      await restoreBackup(pending);
    } catch {
      setStatus({ kind: "error", text: "No se pudo restaurar. Tus datos siguen como estaban." });
      return;
    }
    setPending(undefined);
    setStatus({ kind: "ok", text: "Respaldo restaurado." });
  }

  return (
    <Panel title="Respaldo">
      <p className="text-interfaz text-texto-2">
        Tus datos viven solo en este dispositivo. Si lo pierdes o se borran los datos del navegador, solo los
        recuperas con un respaldo. Descarga uno cada semana y guárdalo en otro lugar.
      </p>
      <p className="text-etiqueta text-texto-2">
        {lastBackupAt
          ? `Último respaldo: ${formatDate(todayInCancun(new Date(lastBackupAt)))}.`
          : "Aún no has descargado un respaldo."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void download()}>Descargar respaldo</Button>
        <Button variant="secundario" onClick={() => fileInput.current?.click()}>
          Restaurar respaldo
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Elegir archivo de respaldo"
          onChange={(event) => void pickFile(event.target.files?.[0])}
        />
      </div>
      {pending ? (
        <div className="flex flex-col gap-3 rounded-tarjeta border border-borde-control bg-elevada p-4">
          <p className="text-interfaz">
            Esto reemplaza tus datos actuales por los del respaldo del{" "}
            {formatDate(todayInCancun(new Date(pending.exportedAt)))}. Tu PIN actual no cambia.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void confirmRestore()}>Restaurar</Button>
            <Button variant="secundario" onClick={() => setPending(undefined)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      {status?.kind === "error" ? <FormMessage>{status.text}</FormMessage> : null}
      <p role="status" className="text-etiqueta text-positivo">
        {status?.kind === "ok" ? status.text : ""}
      </p>
      <p className="flex items-start gap-2 text-etiqueta text-texto-2">
        <HardDrive aria-hidden className="mt-0.5 size-4 shrink-0" />
        {persistent === true
          ? "El navegador marcó tus datos como permanentes: no los borrará por falta de espacio."
          : "El navegador puede borrar los datos si le falta espacio. Instalar la app en la pantalla de inicio ayuda a conservarlos."}
      </p>
      {persistent === false ? (
        <Button variant="enlace" className="h-auto self-start px-0" onClick={() => void requestPersistentStorage().then(setPersistent)}>
          Pedir que los conserve
        </Button>
      ) : null}
    </Panel>
  );
}

function InstallPanel() {
  return (
    <Panel title="Instalar la app">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-interfaz font-semibold">iPhone</h3>
          <p className="text-etiqueta text-texto-2">
            Abre Bóveda en Safari, toca Compartir y elige “Agregar a inicio”. Así abre como app, funciona sin
            internet y conserva mejor tus datos.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-interfaz font-semibold">Android</h3>
          <p className="text-etiqueta text-texto-2">
            Abre Bóveda en Chrome, toca el menú ⋮ y elige “Instalar app” o “Agregar a la pantalla principal”.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function DangerPanel() {
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Borrar datos">
      <p className="text-interfaz text-texto-2">
        Borra todo lo que Bóveda guardó en este dispositivo, incluido el PIN. No se puede deshacer; descarga un
        respaldo antes si quieres conservar algo.
      </p>
      <Button variant="secundario" className="self-start" onClick={() => setOpen(true)}>
        Borrar todos los datos
      </Button>
      <EraseDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Borrar todos los datos"
        description="Se borran tus datos y tu PIN de este dispositivo. Después podrás empezar de nuevo o restaurar un respaldo."
      />
    </Panel>
  );
}
