import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display">Entrar</h1>
        <p className="text-interfaz text-texto-2">
          Tu información financiera está protegida con contraseña y un código de verificación (2FA).
        </p>
      </header>
      <SignInForm />
      <p className="text-nota text-texto-2">
        ¿Olvidaste tu contraseña? Se cambia desde el panel de Supabase; los pasos están en el README, en
        “Si algo sale mal”.
      </p>
    </div>
  );
}
