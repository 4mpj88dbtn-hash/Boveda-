import type { Metadata } from "next";
import { SettingsView } from "@/modules/settings/settings-view";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display lg:text-display-lg">Ajustes</h1>
        <p className="text-interfaz text-texto-2">Tu saludo, tu PIN, tus respaldos y cómo instalar la app.</p>
      </header>
      <SettingsView />
    </>
  );
}
