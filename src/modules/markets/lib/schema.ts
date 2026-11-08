import { z } from "zod";

/** Formato de los archivos que publica GitHub Actions en /datos. Se valida al leerlos. */

const candle = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);
export type Candle = z.infer<typeof candle>;

export const quoteSchema = z.object({
  precio: z.number(),
  cierreAnterior: z.number().nullable(),
  /** Hora del dato (ISO). */
  hora: z.string().nullable(),
  moneda: z.string().nullable(),
  retrasoMin: z.number().nullable(),
  fuente: z.string(),
  mini: z.array(z.number()),
  /** Series diarias (Banxico, FRED): fecha del dato. */
  fechaDato: z.string().optional(),
  /** "anterior": la fuente falló y es el último dato que sí llegó. */
  estado: z.enum(["ok", "anterior"]),
});
export type Quote = z.infer<typeof quoteSchema>;

const marketFileBase = z.object({
  version: z.literal(1),
  generadoEn: z.string(),
  activos: z.record(z.string(), z.unknown()),
  errores: z.array(z.object({ id: z.string(), mensaje: z.string() })),
});

export type MarketFile = {
  generadoEn: string;
  activos: Record<string, Quote>;
  errores: { id: string; mensaje: string }[];
};

/** Valida el archivo; si un activo viene mal, se omite solo ese. */
export function parseMarketFile(json: unknown): MarketFile | null {
  const parsed = marketFileBase.safeParse(json);
  if (!parsed.success) return null;
  const activos: Record<string, Quote> = {};
  for (const [id, value] of Object.entries(parsed.data.activos)) {
    const quote = quoteSchema.safeParse(value);
    if (quote.success) activos[id] = quote.data;
  }
  return { generadoEn: parsed.data.generadoEn, activos, errores: parsed.data.errores };
}

export const intradayFileSchema = z.object({
  id: z.string(),
  actualizado: z.string(),
  unDia: z.array(candle),
  cincoDias: z.array(candle),
});
export type IntradayFile = z.infer<typeof intradayFileSchema>;

export const seriesFileSchema = z.object({
  id: z.string(),
  actualizado: z.string(),
  fuente: z.string(),
  diario: z.array(candle),
  semanal: z.array(candle),
});
export type SeriesFile = z.infer<typeof seriesFileSchema>;
