import { createClient } from "@supabase/supabase-js";
import * as OTPAuth from "otpauth";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local (ver README: pruebas de flujo completo).`);
  return value;
}

export const supabaseUrl = () => requireEnv("SUPABASE_URL");
export const publishableKey = () => requireEnv("SUPABASE_PUBLISHABLE_KEY");

/** Cliente de administración: solo para crear y borrar usuarios de prueba en la base local. */
function adminClient() {
  return createClient(supabaseUrl(), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type TestUser = { id: string; email: string; password: string };

export async function createTestUser(): Promise<TestUser> {
  const email = `prueba+${Date.now()}-${Math.round(Math.random() * 1e6)}@boveda.local`;
  const password = "Prueba-Boveda-2026";
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(user: TestUser | undefined): Promise<void> {
  if (user) await adminClient().auth.admin.deleteUser(user.id);
}

function totp(secret: string) {
  return new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
}

/**
 * Código de la app autenticadora. Si es igual al último usado, espera al siguiente
 * (un código no se puede usar dos veces).
 */
export async function freshCode(secret: string, lastUsed?: string): Promise<string> {
  const generator = totp(secret);
  let code = generator.generate();
  while (code === lastUsed) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    code = generator.generate();
  }
  return code;
}
