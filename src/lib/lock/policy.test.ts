import { describe, expect, it } from "vitest";
import { attemptsBeforeWait, lockoutRemainingMs, shouldLock } from "./policy";

const MIN = 60_000;
const now = Date.UTC(2026, 10, 5, 15, 0, 0);

describe("shouldLock", () => {
  it("con 'siempre' pide el PIN cada vez que se abre la app", () => {
    expect(shouldLock({ policy: "siempre", lastActiveAt: now - 1_000, now, coldStart: true })).toBe(true);
  });

  it("con 'siempre' vuelve a pedirlo si estuvo más de 1 minuto en segundo plano", () => {
    expect(shouldLock({ policy: "siempre", lastActiveAt: now - 30_000, now, coldStart: false })).toBe(false);
    expect(shouldLock({ policy: "siempre", lastActiveAt: now - 61_000, now, coldStart: false })).toBe(true);
  });

  it("con '5-min' solo lo pide si pasaron más de 5 minutos", () => {
    expect(shouldLock({ policy: "5-min", lastActiveAt: now - 4 * MIN, now, coldStart: true })).toBe(false);
    expect(shouldLock({ policy: "5-min", lastActiveAt: now - 5 * MIN - 1, now, coldStart: true })).toBe(true);
    expect(shouldLock({ policy: "5-min", lastActiveAt: now - 6 * MIN, now, coldStart: false })).toBe(true);
  });

  it("sin actividad registrada siempre pide el PIN", () => {
    expect(shouldLock({ policy: "5-min", lastActiveAt: null, now, coldStart: false })).toBe(true);
  });
});

describe("lockoutRemainingMs", () => {
  it("deja 5 intentos libres", () => {
    expect(lockoutRemainingMs(undefined, now)).toBe(0);
    expect(lockoutRemainingMs({ count: 4, lastAt: now }, now)).toBe(0);
    expect(attemptsBeforeWait({ count: 3, lastAt: now })).toBe(2);
  });

  it("después espera 30 s, luego el doble cada vez, hasta 15 minutos", () => {
    expect(lockoutRemainingMs({ count: 5, lastAt: now }, now)).toBe(30_000);
    expect(lockoutRemainingMs({ count: 6, lastAt: now }, now)).toBe(60_000);
    expect(lockoutRemainingMs({ count: 7, lastAt: now }, now)).toBe(120_000);
    expect(lockoutRemainingMs({ count: 20, lastAt: now }, now)).toBe(15 * MIN);
  });

  it("descuenta el tiempo que ya pasó", () => {
    expect(lockoutRemainingMs({ count: 5, lastAt: now - 20_000 }, now)).toBe(10_000);
    expect(lockoutRemainingMs({ count: 5, lastAt: now - 40_000 }, now)).toBe(0);
  });
});
