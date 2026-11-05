/** Cuándo pedir el PIN y cuánto esperar después de varios intentos equivocados. */

export const LOCK_POLICIES = ["siempre", "5-min"] as const;
export type LockPolicy = (typeof LOCK_POLICIES)[number];

export const LOCK_POLICY_LABELS: Record<LockPolicy, string> = {
  siempre: "Cada vez que abres la app",
  "5-min": "Si pasaron más de 5 minutos sin usarla",
};

/** Tiempo en segundo plano tras el cual se vuelve a pedir el PIN. */
export const LOCK_AFTER_MS: Record<LockPolicy, number> = {
  siempre: 60_000,
  "5-min": 5 * 60_000,
};

/**
 * ¿Hay que pedir el PIN?
 * - Al abrir la app ("arranque"): con "siempre", sí; con "5-min", solo si pasó ese tiempo.
 * - Al volver de otra app: si estuvo más tiempo del permitido en segundo plano.
 */
export function shouldLock(input: {
  policy: LockPolicy;
  lastActiveAt: number | null;
  now: number;
  coldStart: boolean;
}): boolean {
  const { policy, lastActiveAt, now, coldStart } = input;
  if (coldStart && policy === "siempre") return true;
  if (lastActiveAt === null) return true;
  return now - lastActiveAt > LOCK_AFTER_MS[policy];
}

export type PinFailures = { count: number; lastAt: number };

/** Intentos libres antes de empezar a esperar. */
export const FREE_ATTEMPTS = 5;
const FIRST_WAIT_MS = 30_000;
const MAX_WAIT_MS = 15 * 60_000;

/** Milisegundos que faltan para poder intentar otra vez (0 si ya se puede). */
export function lockoutRemainingMs(failures: PinFailures | undefined, now: number): number {
  if (!failures || failures.count < FREE_ATTEMPTS) return 0;
  const step = failures.count - FREE_ATTEMPTS;
  const wait = Math.min(FIRST_WAIT_MS * 2 ** step, MAX_WAIT_MS);
  return Math.max(0, failures.lastAt + wait - now);
}

/** Intentos que quedan antes de tener que esperar. */
export function attemptsBeforeWait(failures: PinFailures | undefined): number {
  return Math.max(0, FREE_ATTEMPTS - (failures?.count ?? 0));
}
