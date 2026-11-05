"use client";

import { getDb } from "@/lib/db";
import { clearActivity } from "./activity";

/** Borra todos los datos de Bóveda en este dispositivo y vuelve a empezar. No se puede deshacer. */
export async function eraseAllData(): Promise<void> {
  const db = getDb();
  db.close();
  await db.delete();
  clearActivity();
  window.location.reload();
}
