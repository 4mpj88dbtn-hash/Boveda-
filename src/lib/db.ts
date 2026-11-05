import Dexie, { type EntityTable } from "dexie";
import type { SettingRow } from "./backup";

/**
 * Base de datos de Bóveda dentro del navegador (IndexedDB). Todo vive en tu dispositivo.
 * Reglas para cambiar la estructura: agrega una versión nueva con `this.version(n)`; nunca
 * modifiques ni borres una versión publicada, porque así se actualizan los datos existentes.
 */
class BovedaDatabase extends Dexie {
  settings!: EntityTable<SettingRow, "key">;

  constructor() {
    super("boveda");
    this.version(1).stores({ settings: "key" });
  }
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
