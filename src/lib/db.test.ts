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
    expect(db.verno).toBe(4);
    expect(await db.settings.toArray()).toEqual([
      { key: "displayName", value: "Ana" },
      { key: "lockPolicy", value: "siempre" },
    ]);
    expect(await db.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect(await db.accounts.count()).toBe(1);
    expect(await db.budgets.count()).toBe(0);
    db.close();
  });

  it("al actualizar desde la parte 1 de Finanzas conserva cuentas y movimientos", async () => {
    // Base tal como la dejó la Fase 1, parte 1 (versión 2).
    const v2 = new Dexie("prueba-v2");
    v2.version(1).stores({ settings: "key" });
    v2.version(2).stores({
      settings: "key",
      accounts: "id, order",
      categories: "id, type, order",
      transactions: "id, date, type, categoryId, accountId, toAccountId, createdAt",
    });
    await v2.open();
    await v2.table("transactions").put({ id: "t1", date: "2026-11-05", amountCents: 25_000 });
    await v2.table("accounts").put({ id: "banco", order: 3 });
    v2.close();

    const db = new BovedaDatabase("prueba-v2");
    await db.open();
    expect(db.verno).toBe(4);
    expect(await db.transactions.get("t1")).toMatchObject({ amountCents: 25_000 });
    expect(await db.accounts.get("banco")).toMatchObject({ order: 3 });
    expect(await db.recurring.count()).toBe(0);
    expect(await db.purchases.count()).toBe(0);
    db.close();
  });
});
