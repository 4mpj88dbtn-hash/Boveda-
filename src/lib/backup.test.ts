import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/modules/finance/defaults";
import { account, movement } from "@/modules/finance/lib/test-data";
import { backupFileName, buildBackup, parseBackup, type BackupTables } from "./backup";

const settings = [
  { key: "displayName", value: "Ana" },
  { key: "lockPolicy", value: "siempre" },
  { key: "pin", value: { algorithm: "PBKDF2-SHA256", iterations: 600000, salt: "x", hash: "y" } },
  { key: "pinFailures", value: { count: 2, lastAt: 1 } },
];

const tables: BackupTables = {
  settings,
  accounts: [account({ id: "banco" }), account({ id: "broker", currency: "USD" })],
  categories: DEFAULT_CATEGORIES,
  transactions: [
    movement({ type: "gasto", amountCents: 25_000, accountId: "banco", categoryId: "gasto-comida" }),
    movement({ type: "transferencia", amountCents: 185_000, accountId: "banco", toAccountId: "broker", fxRate: "18.50" }),
  ],
};

const NOW = new Date("2026-11-05T15:00:00Z");

describe("buildBackup", () => {
  it("incluye tus datos pero nunca el PIN ni los intentos fallidos", () => {
    const backup = buildBackup(tables, NOW);
    expect(backup.app).toBe("boveda");
    expect(backup.version).toBe(2);
    expect(backup.exportedAt).toBe("2026-11-05T15:00:00.000Z");
    expect(backup.data.settings.map((row) => row.key)).toEqual(["displayName", "lockPolicy"]);
    expect(backup.data.transactions).toHaveLength(2);
    expect(JSON.stringify(backup)).not.toContain("PBKDF2");
  });
});

describe("parseBackup", () => {
  it("lee un respaldo propio sin perder nada", () => {
    const backup = buildBackup(tables, NOW);
    expect(parseBackup(JSON.stringify(backup))).toEqual({ ok: true, backup });
  });

  it("lee un respaldo de la Fase 0 y le agrega lo de inicio de Finanzas", () => {
    const text = JSON.stringify({ app: "boveda", version: 1, exportedAt: NOW.toISOString(), data: { settings } });
    const result = parseBackup(text);
    if (!result.ok) throw new Error(result.error);
    expect(result.backup.data.settings.map((row) => row.key)).toEqual(["displayName", "lockPolicy"]);
    expect(result.backup.data.categories).toEqual(DEFAULT_CATEGORIES);
    expect(result.backup.data.accounts.map((item) => item.name)).toEqual(["Efectivo"]);
    expect(result.backup.data.transactions).toEqual([]);
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
    [
      "tiene un monto con decimales",
      JSON.stringify(buildBackup({ ...tables, transactions: [movement({ type: "gasto", amountCents: 1.5 })] }, NOW)),
    ],
  ])("rechaza un archivo que %s", (_case, text) => {
    expect(parseBackup(text)).toEqual({
      ok: false,
      error: "El archivo no es un respaldo de Bóveda. Elige el archivo .json que descargaste.",
    });
  });

  it.each([
    ["una cuenta que no existe", movement({ type: "gasto", amountCents: 100, accountId: "otra" })],
    ["una categoría que no existe", movement({ type: "gasto", amountCents: 100, categoryId: "inventada" })],
    ["dólares sin tipo de cambio", movement({ type: "gasto", amountCents: 100, currency: "USD" })],
  ])("rechaza movimientos con %s", (_case, transaction) => {
    const text = JSON.stringify(buildBackup({ ...tables, transactions: [transaction] }, NOW));
    expect(parseBackup(text)).toMatchObject({ ok: false, error: expect.stringMatching(/dañado/) });
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
