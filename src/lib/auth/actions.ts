"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ENROLL_PATH, HOME_PATH, SIGN_IN_PATH, VERIFY_PATH } from "./routes";

export type AuthFormState = { error?: string; email?: string };

const credentialsSchema = z.object({
  email: z.email({ message: "Escribe un correo válido." }),
  password: z.string().min(1, { message: "Escribe tu contraseña." }),
});

const codeSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { message: "Escribe los 6 dígitos del código." }));

const factorIdSchema = z.uuid({ message: "Recarga la página para generar un código nuevo." });

function isRateLimited(error: AuthError): boolean {
  return error.status === 429;
}

const RATE_LIMIT_MESSAGE = "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
const WRONG_CODE_MESSAGE =
  "El código no coincide o ya cambió. Escribe el que se ve ahora en tu app autenticadora.";

/** Paso 1: correo y contraseña. Luego pide el código 2FA (o activarlo si es la primera vez). */
export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = credentialsSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { email, error: parsed.error.issues[0]?.message ?? "Revisa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { email, error: isRateLimited(error) ? RATE_LIMIT_MESSAGE : "Correo o contraseña incorrectos." };
  }

  const hasVerifiedFactor = data.user.factors?.some((factor) => factor.status === "verified") ?? false;
  redirect(hasVerifiedFactor ? VERIFY_PATH : ENROLL_PATH);
}

/** Paso 2: código de la app autenticadora. */
export async function verifyCode(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const code = codeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { error: code.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    return { error: listError.status === 401 ? "Tu sesión expiró. Vuelve a entrar." : "No se pudo revisar tu 2FA. Intenta de nuevo." };
  }
  const factor = factors.all.find((item) => item.factor_type === "totp" && item.status === "verified");
  if (!factor) redirect(ENROLL_PATH);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
  if (error) return { error: isRateLimited(error) ? RATE_LIMIT_MESSAGE : WRONG_CODE_MESSAGE };
  redirect(HOME_PATH);
}

/** Primera vez: confirma el código para activar el 2FA. */
export async function verifyEnrollment(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const factorId = factorIdSchema.safeParse(formData.get("factorId"));
  if (!factorId.success) return { error: factorId.error.issues[0]?.message };
  const code = codeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { error: code.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: code.data });
  if (error) return { error: isRateLimited(error) ? RATE_LIMIT_MESSAGE : WRONG_CODE_MESSAGE };
  redirect(HOME_PATH);
}

/** Cierra la sesión solo en este dispositivo. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(SIGN_IN_PATH);
}
