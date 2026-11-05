import { describe, expect, it } from "vitest";
import { createPinRecord, PBKDF2_ITERATIONS, pinProblem, verifyPin } from "./pin";

describe("pinProblem", () => {
  it("acepta un PIN de 6 dígitos difícil de adivinar", () => {
    expect(pinProblem("482915")).toBeNull();
    expect(pinProblem("070394")).toBeNull();
  });

  it.each(["12345", "1234567", "12a456", ""])("pide 6 dígitos: %j", (pin) => {
    expect(pinProblem(pin)).toBe("El PIN debe tener 6 dígitos.");
  });

  it.each(["000000", "111111", "123456", "234567", "890123", "654321", "210987", "123123"])(
    "rechaza PIN obvios: %s",
    (pin) => {
      expect(pinProblem(pin)).toMatch(/fácil de adivinar/);
    },
  );
});

describe("createPinRecord y verifyPin", () => {
  it("usa 600,000 vueltas por defecto y nunca guarda el PIN", async () => {
    const record = await createPinRecord("482915");
    expect(record.iterations).toBe(PBKDF2_ITERATIONS);
    expect(record.algorithm).toBe("PBKDF2-SHA256");
    expect(JSON.stringify(record)).not.toContain("482915");
    expect(await verifyPin("482915", record)).toBe(true);
    expect(await verifyPin("482916", record)).toBe(false);
  });

  it("coincide con un valor de referencia calculado aparte (PBKDF2-SHA256)", async () => {
    // Referencia calculada con Python: hashlib.pbkdf2_hmac("sha256", b"482915", bytes(range(16)), 1000).
    const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
    const record = await createPinRecord("482915", { salt, iterations: 1000 });
    expect(record.salt).toBe("AAECAwQFBgcICQoLDA0ODw==");
    expect(record.hash).toBe(REFERENCE_HASH);
  });

  it("dos registros del mismo PIN son distintos por la sal aleatoria", async () => {
    const a = await createPinRecord("482915", { iterations: 1000 });
    const b = await createPinRecord("482915", { iterations: 1000 });
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

const REFERENCE_HASH = "RXhJzsL7vvT/crNj2l+IOgOExnzWQsZ/dMqF/DzEioM=";
