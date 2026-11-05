import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { DEFAULT_ACCOUNT_ID, DEFAULT_CATEGORIES } from "@/modules/finance/defaults";
import { BovedaDatabase } from "./db";

describe("base de datos", () => {
  it("una base nueva empieza con las categorías y la cuenta Efectivo", async () => {
    const db = new BovedaDatabase("prueba-nueva");
    await db.open();
    expect(await db.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect(await db.accounts.get(DEFAULT_ACCOUNT_ID)).toMatchObject({ name: "Efectivo", currency: "MXN" });
    expect(await db.transactions.count()).toBe(0);
    db.close();
  });

  it("al actualizar desde la Fase 0 conserva los ajustes y agrega finanzas", async () => {
    // Base tal como la dejó la Fase 0 (versión 1, solo ajustes).
    const phase0 = new Dexie("prueba-migracion");
    phase0.version(1).stores({ settings: "key" });
    await phase0.open();
    await phase0.table("settings").bulkPut([
      { key: "displayName", value: "Ana" },
      { key: "lockPolicy", value: "siempre" },
    ]);
    phase0.close();

    const db = new BovedaDatabase("prueba-migracion");
    await db.open();
    expect(db.verno).toBe(2);
    expect(await db.settings.toArray()).toEqual([
      { key: "displayName", value: "Ana" },
      { key: "lockPolicy", value: "siempre" },
    ]);
    expect(await db.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect(await db.accounts.count()).toBe(1);
    db.close();
  });
});
