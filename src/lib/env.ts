import "server-only";
import { parseSupabaseEnv, type SupabaseEnv } from "./env-schema";

/** Configuración de Supabase validada. Solo existe en el servidor. */
export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv(process.env);
}
