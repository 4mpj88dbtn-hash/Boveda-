import { describe, expect, it } from "vitest";
import { resolveRedirect } from "./routes";

describe("resolveRedirect", () => {
  it("manda a entrar a quien no tiene sesión", () => {
    expect(resolveRedirect("/", { kind: "sin-sesion" })).toBe("/entrar");
    expect(resolveRedirect("/finanzas", { kind: "sin-sesion" })).toBe("/entrar");
    expect(resolveRedirect("/entrar/verificar", { kind: "sin-sesion" })).toBe("/entrar");
    expect(resolveRedirect("/entrar", { kind: "sin-sesion" })).toBeNull();
  });

  it("pide el código 2FA antes de dejar pasar", () => {
    const withFactor = { kind: "falta-2fa", hasVerifiedFactor: true } as const;
    expect(resolveRedirect("/", withFactor)).toBe("/entrar/verificar");
    expect(resolveRedirect("/entrar", withFactor)).toBe("/entrar/verificar");
    expect(resolveRedirect("/entrar/activar-2fa", withFactor)).toBe("/entrar/verificar");
    expect(resolveRedirect("/entrar/verificar", withFactor)).toBeNull();
  });

  it("obliga a activar 2FA a quien todavía no lo tiene", () => {
    const withoutFactor = { kind: "falta-2fa", hasVerifiedFactor: false } as const;
    expect(resolveRedirect("/", withoutFactor)).toBe("/entrar/activar-2fa");
    expect(resolveRedirect("/entrar/verificar", withoutFactor)).toBe("/entrar/activar-2fa");
    expect(resolveRedirect("/entrar/activar-2fa", withoutFactor)).toBeNull();
  });

  it("con 2FA verificado deja pasar y saca de las páginas de entrar", () => {
    expect(resolveRedirect("/", { kind: "verificada" })).toBeNull();
    expect(resolveRedirect("/ajustes", { kind: "verificada" })).toBeNull();
    expect(resolveRedirect("/entrar", { kind: "verificada" })).toBe("/");
    expect(resolveRedirect("/entrar/verificar", { kind: "verificada" })).toBe("/");
  });

  it("la pantalla sin conexión siempre se puede ver", () => {
    expect(resolveRedirect("/sin-conexion", { kind: "sin-sesion" })).toBeNull();
    expect(resolveRedirect("/sin-conexion", { kind: "verificada" })).toBeNull();
  });

  it("no confunde rutas que solo empiezan parecido", () => {
    expect(resolveRedirect("/entrarx", { kind: "verificada" })).toBeNull();
  });
});
