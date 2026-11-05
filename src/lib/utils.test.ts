import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("no confunde los tamaños de texto propios con colores", () => {
    expect(cn("text-hero text-texto", "text-texto-2")).toBe("text-hero text-texto-2");
    expect(cn("text-cuerpo", "text-nota")).toBe("text-nota");
  });

  it("respeta los radios propios", () => {
    expect(cn("rounded-control", "rounded-tarjeta")).toBe("rounded-tarjeta");
  });
});
