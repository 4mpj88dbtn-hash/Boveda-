import "server-only";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type Profile = { displayName: string | null; email: string | null };

/** Perfil del usuario con sesión verificada. */
export async function getProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("No se pudo leer el perfil.");
  return { displayName: data?.display_name ?? null, email: user.email };
}
