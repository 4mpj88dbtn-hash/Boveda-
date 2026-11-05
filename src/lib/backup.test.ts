import { describe, expect, it } from "vitest";
import { backupFileName, buildBackup, parseBackup } from "./backup";

const settings = [
  { key: "displayName", value: "Ana" },
  { key: "lockPolicy", value: "siempre" },
  { key: "pin", value: { algorithm: "PBKDF2-SHA256", iterations: 600000, salt: "x", hash: "y" } },
  { key: "pinFailures", value: { count: 2, lastAt: 1 } },
];

describe("buildBackup", () => {
  it("incluye tus datos pero nunca el PIN ni los intentos fallidos", () => {
    const backup = buildBackup({ settings }, new Date("2026-11-05T15:00:00Z"));
    expect(backup.app).toBe("boveda");
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBe("2026-11-05T15:00:00.000Z");
    expect(backup.data.settings.map((row) => row.key)).toEqual(["displayName", "lockPolicy"]);
    expect(JSON.stringify(backup)).not.toContain("PBKDF2");
  });
});

describe("parseBackup", () => {
  it("lee un respaldo propio", () => {
    const text = JSON.stringify(buildBackup({ settings }, new Date("2026-11-05T15:00:00Z")));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.settings).toHaveLength(2);
  });

  it("ignora un PIN aunque alguien lo agregue al archivo", () => {
    const text = JSON.stringify({ app: "boveda", version: 1, exportedAt: "x", data: { settings } });
    const result = parseBackup(text);
    expect(result.ok && result.backup.data.settings.some((row) => row.key === "pin")).toBe(false);
  });

  it.each([
    ["no es JSON", "hola"],
    ["es de otra app", JSON.stringify({ app: "otra", version: 1, exportedAt: "x", data: { settings: [] } })],
    ["le faltan datos", JSON.stringify({ app: "boveda", version: 1 })],
  ])("rechaza un archivo que %s", (_case, text) => {
    expect(parseBackup(text)).toEqual({
      ok: false,
      error: "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste.",
    });
  });

  it("avisa si el respaldo es de una versión más nueva", () => {
    const text = JSON.stringify({ app: "boveda", version: 99, exportedAt: "x", data: { settings: [] } });
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/versión más nueva/);
  });
});

describe("backupFileName", () => {
  it("usa la fecha de Cancún", () => {
    // 03:00 UTC del 6 de noviembre = 22:00 del 5 de noviembre en Cancún.
    expect(backupFileName(new Date("2026-11-06T03:00:00Z"))).toBe("boveda-respaldo-2026-11-05.json");
  });
});
