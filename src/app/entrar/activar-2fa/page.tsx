import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { HOME_PATH, SIGN_IN_PATH, VERIFY_PATH } from "@/lib/auth/routes";
import { signOut, verifyEnrollment } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { CodeForm } from "../code-form";
import { CopySecret } from "./copy-secret";

export const metadata: Metadata = { title: "Activa tu 2FA" };

export default function EnrollPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display">Activa tu 2FA</h1>
        <p className="text-interfaz text-texto-2">
          Es un código que cambia cada 30 segundos. Protege tu información aunque alguien conozca tu
          contraseña. Solo lo configuras una vez.
        </p>
      </header>
      <Suspense fallback={<p className="text-interfaz text-texto-2">Preparando tu código…</p>}>
        <Enrollment />
      </Suspense>
      <form action={signOut}>
        <Button type="submit" variant="enlace" className="h-11 px-0">
          Entrar con otra cuenta
        </Button>
      </form>
    </div>
  );
}

async function Enrollment() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(SIGN_IN_PATH);
  if (claims.claims.aal === "aal2") redirect(HOME_PATH);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if ((factors?.totp.length ?? 0) > 0) redirect(VERIFY_PATH);

  // Borra intentos anteriores que no se terminaron, para empezar con un código limpio.
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Bóveda",
    issuer: "Bóveda",
  });
  if (error || !data) {
    return <FormMessage>No se pudo preparar tu código. Recarga la página para intentar de nuevo.</FormMessage>;
  }

  return (
    <ol className="flex flex-col gap-6">
      <li className="flex flex-col gap-3">
        <h2 className="text-titulo">1. Agrega Bóveda a tu app autenticadora</h2>
        <a
          href={data.totp.uri}
          className="inline-flex h-12 items-center justify-center rounded-control bg-laton px-5 text-cuerpo font-semibold text-sobre-laton"
        >
          Agregar en este celular
        </a>
        <p className="text-nota text-texto-2">
          Abre tu app de códigos: Google Authenticator, Microsoft Authenticator, 1Password u otra.
        </p>
        <details className="rounded-tarjeta border border-borde bg-superficie p-4">
          <summary className="cursor-pointer text-interfaz font-medium">Escanear desde otro dispositivo</summary>
          <div className="mt-4 flex justify-center rounded-control bg-texto p-3">
            {/* El código QR llega como imagen SVG lista para mostrar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.totp.qr_code} alt="Código QR para tu app autenticadora" width={200} height={200} />
          </div>
        </details>
        <CopySecret secret={data.totp.secret} />
      </li>
      <li className="flex flex-col gap-3">
        <h2 className="text-titulo">2. Escribe el código que te muestra la app</h2>
        <CodeForm
          action={verifyEnrollment}
          submitLabel="Activar 2FA"
          pendingLabel="Activando…"
          hiddenFields={{ factorId: data.id }}
        />
      </li>
    </ol>
  );
}
