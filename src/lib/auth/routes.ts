/** Rutas del inicio de sesión. */
export const SIGN_IN_PATH = "/entrar";
export const VERIFY_PATH = "/entrar/verificar";
export const ENROLL_PATH = "/entrar/activar-2fa";
export const HOME_PATH = "/";

/** Páginas que se ven sin sesión (además de las de entrar). */
export const PUBLIC_PATHS = ["/sin-conexion"];

export type AccessState =
  | { kind: "sin-sesion" }
  | { kind: "falta-2fa"; hasVerifiedFactor: boolean }
  | { kind: "verificada" };

/**
 * Decide a dónde debe ir alguien según su sesión.
 * Devuelve la ruta a la que hay que mandarlo, o null si puede quedarse.
 */
export function resolveRedirect(path: string, access: AccessState): string | null {
  if (PUBLIC_PATHS.includes(path)) return null;
  const inAuthArea = path === SIGN_IN_PATH || path.startsWith(`${SIGN_IN_PATH}/`);

  switch (access.kind) {
    case "sin-sesion":
      return path === SIGN_IN_PATH ? null : SIGN_IN_PATH;
    case "falta-2fa": {
      const target = access.hasVerifiedFactor ? VERIFY_PATH : ENROLL_PATH;
      return path === target ? null : target;
    }
    case "verificada":
      return inAuthArea ? HOME_PATH : null;
  }
}
