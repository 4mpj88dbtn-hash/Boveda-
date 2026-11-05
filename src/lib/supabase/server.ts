import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el servidor (Server Components y Server Actions).
 * El navegador nunca habla directo con Supabase: todo pasa por el servidor de la app.
 * Crea uno nuevo en cada petición.
 */
export async function createClient() {
  // La sesión solo existe al llegar una petición: nada de esto se pre-renderiza.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies; el proxy ya renovó la sesión.
        }
      },
    },
  });
}
