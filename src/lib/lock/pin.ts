/**
 * PIN de Bóveda. Nunca se guarda el PIN: solo una huella derivada con PBKDF2-SHA256
 * (600,000 vueltas y sal aleatoria), así que no se puede leer aunque alguien vea los datos.
 */

export const PIN_LENGTH = 6;
export const PBKDF2_ITERATIONS = 600_000;

export type PinRecord = {
  algorithm: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  hash: string;
};

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Compara sin salir antes, para no dar pistas por el tiempo de respuesta. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Revisa que el PIN tenga 6 dígitos y no sea fácil de adivinar. Devuelve el problema o null. */
export function pinProblem(pin: string): string | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `El PIN debe tener ${PIN_LENGTH} dígitos.`;
  const digits = [...pin].map(Number);
  const allSame = digits.every((digit) => digit === digits[0]);
  const ascending = digits.every((digit, i) => i === 0 || digit === ((digits[i - 1] ?? 0) + 1) % 10);
  const descending = digits.every((digit, i) => i === 0 || digit === ((digits[i - 1] ?? 0) + 9) % 10);
  const repeatedHalf = pin.slice(0, PIN_LENGTH / 2) === pin.slice(PIN_LENGTH / 2);
  if (allSame || ascending || descending || repeatedHalf) {
    return "Ese PIN es muy fácil de adivinar. Elige otro.";
  }
  return null;
}

export async function createPinRecord(
  pin: string,
  options: { iterations?: number; salt?: Uint8Array<ArrayBuffer> } = {},
): Promise<PinRecord> {
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const iterations = options.iterations ?? PBKDF2_ITERATIONS;
  const hash = await derive(pin, salt, iterations);
  return { algorithm: "PBKDF2-SHA256", iterations, salt: toBase64(salt), hash: toBase64(hash) };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  const hash = await derive(pin, fromBase64(record.salt), record.iterations);
  return constantTimeEqual(hash, fromBase64(record.hash));
}
