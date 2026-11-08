"use client";

import { useDataFile } from "@/modules/markets/data";
import { parseCalendarFile, parseNewsFile, parseSignalsFile } from "./lib/schema";

/** Noticias, calendario y señales publicados por GitHub Actions (con copia sin internet). */

export function useNewsFile() {
  return useDataFile("/datos/noticias.json", parseNewsFile);
}

export function useCalendarFile() {
  return useDataFile("/datos/calendario.json", parseCalendarFile, 30 * 60_000);
}

export function useSignalsFile() {
  return useDataFile("/datos/senales.json", parseSignalsFile);
}
