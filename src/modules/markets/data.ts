"use client";

import { useEffect, useSyncExternalStore } from "react";
import { withBasePath } from "@/lib/base-path";
import {
  intradayFileSchema,
  parseMarketFile,
  seriesFileSchema,
  type IntradayFile,
  type MarketFile,
  type SeriesFile,
} from "./lib/schema";

/**
 * Lee los archivos de mercado que publica GitHub Actions junto a la app (/datos). Sin
 * internet, el service worker entrega la última copia guardada. Si un archivo falla, se
 * sigue mostrando el último que sí llegó, con su hora.
 */

export type DataState<T> = {
  status: "cargando" | "listo" | "error";
  data: T | null;
  /** Cuándo se leyó por última vez con éxito (ms). */
  loadedAt: number;
};

const INITIAL: DataState<never> = { status: "cargando", data: null, loadedAt: 0 };
const cache = new Map<string, DataState<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

function emit(path: string) {
  for (const listener of listeners.get(path) ?? []) listener();
}

function load<T>(path: string, parse: (json: unknown) => T | null): Promise<void> {
  const running = inflight.get(path);
  if (running) return running;
  const task = (async () => {
    const previous = cache.get(path) as DataState<T> | undefined;
    try {
      const response = await fetch(withBasePath(path), { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      const data = parse(await response.json());
      if (data === null) throw new Error("formato");
      cache.set(path, { status: "listo", data, loadedAt: Date.now() });
    } catch {
      cache.set(path, { status: "error", data: previous?.data ?? null, loadedAt: previous?.loadedAt ?? 0 });
    } finally {
      inflight.delete(path);
      emit(path);
    }
  })();
  inflight.set(path, task);
  return task;
}

export function useDataFile<T>(path: string | null, parse: (json: unknown) => T | null, maxAgeMs = 5 * 60_000): DataState<T> {
  const state = useSyncExternalStore(
    (listener) => {
      if (!path) return () => {};
      const set = listeners.get(path) ?? new Set();
      set.add(listener);
      listeners.set(path, set);
      return () => set.delete(listener);
    },
    () => (path ? ((cache.get(path) as DataState<T> | undefined) ?? INITIAL) : INITIAL),
    () => INITIAL,
  );

  useEffect(() => {
    if (!path) return;
    const current = cache.get(path);
    if (!current || Date.now() - current.loadedAt > maxAgeMs) void load(path, parse);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(path, parse);
    }, maxAgeMs);
    return () => clearInterval(timer);
  }, [path, parse, maxAgeMs]);

  return state;
}

const parseIntraday = (json: unknown): IntradayFile | null => {
  const parsed = intradayFileSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
};

const parseSeries = (json: unknown): SeriesFile | null => {
  const parsed = seriesFileSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
};

export function useMarketFile(): DataState<MarketFile> {
  return useDataFile("/datos/mercados.json", parseMarketFile);
}

export function useIntraday(id: string | null): DataState<IntradayFile> {
  return useDataFile(id ? `/datos/intradia/${id}.json` : null, parseIntraday);
}

export function useSeries(id: string | null): DataState<SeriesFile> {
  return useDataFile(id ? `/datos/series/${id}.json` : null, parseSeries, 60 * 60_000);
}

/** Velas de 5 y 30 minutos de un activo, para revisar varios a la vez (simulador). */
export async function fetchIntraday(id: string): Promise<IntradayFile | null> {
  const path = `/datos/intradia/${id}.json`;
  const current = cache.get(path) as DataState<IntradayFile> | undefined;
  if (current?.data && Date.now() - current.loadedAt < 5 * 60_000) return current.data;
  await load(path, parseIntraday);
  return (cache.get(path) as DataState<IntradayFile> | undefined)?.data ?? null;
}

/** Para pantallas que necesitan varias series a la vez (comparador). */
export async function fetchSeries(id: string): Promise<SeriesFile | null> {
  const path = `/datos/series/${id}.json`;
  const current = cache.get(path) as DataState<SeriesFile> | undefined;
  if (current?.data && Date.now() - current.loadedAt < 60 * 60_000) return current.data;
  await load(path, parseSeries);
  return (cache.get(path) as DataState<SeriesFile> | undefined)?.data ?? null;
}
