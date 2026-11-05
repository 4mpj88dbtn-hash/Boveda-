import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.url({ message: "SUPABASE_URL debe ser una dirección web válida." }),
  publishableKey: z.string().min(20, { message: "SUPABASE_PUBLISHABLE_KEY está vacía o incompleta." }),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

type EnvSource = Record<string, string | undefined>;

/**
 * Lee la configuración de Supabase. Acepta los nombres de este proyecto y los que crea la
 * integración de Supabase en Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY…).
 */
export function parseSupabaseEnv(source: EnvSource): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse({
    url: source.SUPABASE_URL ?? source.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey:
      source.SUPABASE_PUBLISHABLE_KEY ??
      source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      source.SUPABASE_ANON_KEY ??
      source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    const detail = result.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(
      `Falta configurar Supabase. ${detail} Copia .env.example como .env.local y llena los valores.`,
    );
  }
  return result.data;
}
