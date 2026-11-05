import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signOut, verifyCode } from "@/lib/auth/actions";
import { CodeForm } from "../code-form";

export const metadata: Metadata = { title: "Código de verificación" };

export default function VerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display">Código de verificación</h1>
        <p className="text-interfaz text-texto-2">
          Abre tu app autenticadora y escribe el código de 6 dígitos de Bóveda.
        </p>
      </header>
      <CodeForm action={verifyCode} submitLabel="Verificar" pendingLabel="Verificando…" />
      <form action={signOut}>
        <Button type="submit" variant="enlace" className="h-11 px-0">
          Entrar con otra cuenta
        </Button>
      </form>
    </div>
  );
}
