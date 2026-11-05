import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { signOut } from "@/lib/auth/actions";
import { getProfile } from "@/modules/profile/queries";
import { DisplayNameForm } from "./display-name-form";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display lg:text-display-lg">Ajustes</h1>
        <p className="text-interfaz text-texto-2">Tu saludo, tu seguridad y cómo instalar la app.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Panel title="Saludo">
          <Suspense fallback={<p className="text-interfaz text-texto-2">Cargando tu perfil…</p>}>
            <ProfileSection />
          </Suspense>
        </Panel>

        <Panel title="Seguridad">
          <Suspense fallback={<p className="text-interfaz text-texto-2">Revisando tu sesión…</p>}>
            <SecuritySection />
          </Suspense>
        </Panel>

        <Panel title="Instalar la app" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-interfaz font-semibold">iPhone</h3>
              <p className="text-etiqueta text-texto-2">
                Abre Bóveda en Safari, toca Compartir y elige “Agregar a inicio”. Así también recibirás
                notificaciones cuando lleguen en la Fase 3.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-sans text-interfaz font-semibold">Android</h3>
              <p className="text-etiqueta text-texto-2">
                Abre Bóveda en Chrome, toca el menú ⋮ y elige “Instalar app” o “Agregar a la pantalla
                principal”.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

async function ProfileSection() {
  const profile = await getProfile();
  return <DisplayNameForm defaultValue={profile.displayName ?? ""} />;
}

async function SecuritySection() {
  const profile = await getProfile();
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-interfaz">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-positivo" />
        <span>
          2FA activo con app autenticadora.
          {profile.email ? <span className="block text-etiqueta text-texto-2">Cuenta: {profile.email}</span> : null}
        </span>
      </p>
      <form action={signOut}>
        <Button type="submit" variant="secundario">
          Cerrar sesión en este dispositivo
        </Button>
      </form>
    </div>
  );
}
