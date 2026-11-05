import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveRedirect, type AccessState } from "@/lib/auth/routes";
import { parseSupabaseEnv } from "@/lib/env-schema";

/**
 * Renueva la sesión en cada petición y manda a cada quien a donde le toca:
 * sin sesión → entrar; con contraseña pero sin 2FA → código; con 2FA → la app.
 * Es una revisión rápida: cada página y cada acción vuelve a verificar la sesión.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = parseSupabaseEnv(process.env);

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // No pongas código entre la creación del cliente y getClaims(): renueva la sesión.
  const { data } = await supabase.auth.getClaims();

  let access: AccessState = { kind: "sin-sesion" };
  if (data?.claims) {
    if (data.claims.aal === "aal2") {
      access = { kind: "verificada" };
    } else {
      // Pregunta al servidor de Supabase (dato verificado) si ya activó su 2FA.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      access = { kind: "falta-2fa", hasVerifiedFactor: (factors?.totp.length ?? 0) > 0 };
    }
  }

  const target = resolveRedirect(request.nextUrl.pathname, access);
  if (!target) return response;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = target;
  redirectUrl.search = "";
  const redirect = NextResponse.redirect(redirectUrl);
  // Conserva las cookies renovadas y los encabezados que evitan guardar la sesión en caché.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}
