import Dexie, { type EntityTable, type Transaction as DexieTransaction } from "dexie";
import { DEFAULT_CATEGORIES, defaultAccounts } from "@/modules/finance/defaults";
import type { Dividend, Purchase } from "@/modules/investing/lib/portfolio";
import type { Trade, TradeImage, TradeReview } from "@/modules/trading/types";
import type {
  Account,
  Attachment,
  Budget,
  Category,
  Recurring,
  Template,
  Transaction,
} from "@/modules/finance/types";
import type { SettingRow } from "./backup";

/**
 * Base de datos de Bóveda dentro del navegador (IndexedDB). Todo vive en tu dispositivo.
 * Reglas para cambiar la estructura: agrega una versión nueva con `this.version(n)`; nunca
 * modifiques ni borres una versión publicada, porque así se actualizan los datos existentes.
 * Toda tabla nueva entra en el respaldo (`backup.ts`) y en su restauración.
 */
export class BovedaDatabase extends Dexie {
  settings!: EntityTable<SettingRow, "key">;
  accounts!: EntityTable<Account, "id">;
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "categoryId">;
  recurring!: EntityTable<Recurring, "id">;
  templates!: EntityTable<Template, "id">;
  attachments!: EntityTable<Attachment, "id">;
  purchases!: EntityTable<Purchase, "id">;
  dividends!: EntityTable<Dividend, "id">;
  trades!: EntityTable<Trade, "id">;
  tradeImages!: EntityTable<TradeImage, "id">;
  tradeReviews!: EntityTable<TradeReview, "weekStart">;

  constructor(name = "boveda") {
    super(name);
    // Fase 0
    this.version(1).stores({ settings: "key" });
    // Fase 1: finanzas. A quien ya usaba la app le agrega las categorías y la cuenta Efectivo.
    this.version(2)
      .stores({
        settings: "key",
        accounts: "id, order",
        categories: "id, type, order",
        transactions: "id, date, type, categoryId, accountId, toAccountId, createdAt",
      })
      .upgrade(seedFinance);
    // Fase 1, parte 2: presupuestos, recurrentes, plantillas y fotos de tickets (tablas nuevas, vacías).
    this.version(3).stores({
      settings: "key",
      accounts: "id, order",
      categories: "id, type, order",
      transactions: "id, date, type, categoryId, accountId, toAccountId, createdAt",
      budgets: "categoryId",
      recurring: "id, nextDate",
      templates: "id, order",
      attachments: "id, transactionId",
    });
    // Fase 4: compras de ETFs y dividendos recibidos (tablas nuevas, vacías).
    this.version(4).stores({
      settings: "key",
      accounts: "id, order",
      categories: "id, type, order",
      transactions: "id, date, type, categoryId, accountId, toAccountId, createdAt",
      budgets: "categoryId",
      recurring: "id, nextDate",
      templates: "id, order",
      attachments: "id, transactionId",
      purchases: "id, date, assetId",
      dividends: "id, date, assetId",
    });
    // Fase 5: operaciones de trading (simulador y reales), sus capturas y revisiones semanales.
    this.version(5).stores({
      settings: "key",
      accounts: "id, order",
      categories: "id, type, order",
      transactions: "id, date, type, categoryId, accountId, toAccountId, createdAt",
      budgets: "categoryId",
      recurring: "id, nextDate",
      templates: "id, order",
      attachments: "id, transactionId",
      purchases: "id, date, assetId",
      dividends: "id, date, assetId",
      trades: "id, account, status, openedAt, closedAt",
      tradeImages: "id, tradeId",
      tradeReviews: "weekStart",
    });
    // Base nueva: se crea directo en la última versión y aquí recibe lo inicial.
    this.on("populate", seedFinance);
  }
}

async function seedFinance(transaction: DexieTransaction): Promise<void> {
  await transaction.table("categories").bulkPut(DEFAULT_CATEGORIES);
  await transaction.table("accounts").bulkPut(defaultAccounts(Date.now()));
}

let instance: BovedaDatabase | undefined;

/** La base solo existe en el navegador; se abre la primera vez que se usa. */
export function getDb(): BovedaDatabase {
  instance ??= new BovedaDatabase();
  return instance;
}

/** Pide al navegador que no borre los datos por falta de espacio. Devuelve si lo concedió. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStoragePersistent(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    return null;
  }
}
