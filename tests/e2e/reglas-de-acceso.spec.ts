import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser, freshCode, publishableKey, supabaseUrl } from "./helpers";

// Prueba directa contra la API de la base: aunque alguien tenga la contraseña,
// sin el código 2FA no recibe ningún dato.
test("sin 2FA la base no entrega datos; con 2FA solo los tuyos", async () => {
  test.skip(test.info().project.name !== "escritorio", "Basta con correrla una vez.");
  const user = await createTestUser();
  try {
    const client = createClient(supabaseUrl(), publishableKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    expect(signInError).toBeNull();

    const withoutMfa = await client.from("profiles").select("id");
    expect(withoutMfa.error).toBeNull();
    expect(withoutMfa.data).toEqual([]);

    const { data: factor, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp" });
    expect(enrollError).toBeNull();
    if (!factor) throw new Error("No se creó el factor 2FA");
    const code = await freshCode(factor.totp.secret);
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    expect(verifyError).toBeNull();

    const withMfa = await client.from("profiles").select("id");
    expect(withMfa.error).toBeNull();
    expect(withMfa.data).toEqual([{ id: user.id }]);
  } finally {
    await deleteTestUser(user);
  }
});
