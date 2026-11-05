import { describe, expect, it } from "vitest";
import { parseSupabaseEnv } from "./env-schema";

const KEY = "sb_publishable_ejemplo_de_clave_larga";

describe("parseSupabaseEnv", () => {
  it("lee los nombres del proyecto", () => {
    expect(
      parseSupabaseEnv({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_PUBLISHABLE_KEY: KEY }),
    ).toEqual({ url: "https://abc.supabase.co", publishableKey: KEY });
  });

  it("acepta los nombres de la integración de Vercel", () => {
    expect(
      parseSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY,
      }),
    ).toEqual({ url: "https://abc.supabase.co", publishableKey: KEY });
  });

  it("explica qué falta", () => {
    expect(() => parseSupabaseEnv({})).toThrow(/Falta configurar Supabase/);
    expect(() => parseSupabaseEnv({ SUPABASE_URL: "no-es-url", SUPABASE_PUBLISHABLE_KEY: KEY })).toThrow(
      /SUPABASE_URL/,
    );
  });
});
