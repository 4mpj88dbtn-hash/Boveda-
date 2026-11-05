import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SIGN_IN_PATH, VERIFY_PATH } from "./routes";

export type SessionUser = { id: string; email: string | null };

/**
 * Devuelve el usuario con sesión verificada por 2FA. Si no la hay, lo manda a entrar.
 * Úsalo en cada página y en cada Server Action que toque datos.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) redirect(SIGN_IN_PATH);
  if (claims.aal !== "aal2") redirect(VERIFY_PATH);
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
