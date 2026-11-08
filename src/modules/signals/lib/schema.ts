import { z } from "zod";

/** Archivos de noticias, calendario y señales que publica GitHub Actions. Se validan al leerlos. */

export const PRIORITIES = ["critica", "importante", "informativa"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  critica: "Crítica",
  importante: "Importante",
  informativa: "Informativa",
};

export const newsItemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  enlace: z.string().url(),
  fuente: z.string(),
  fecha: z.string().nullable(),
  resumen: z.string(),
  temas: z.array(z.string()),
  activos: z.array(z.string()),
  prioridad: z.enum(PRIORITIES),
  otrasFuentes: z.array(z.object({ fuente: z.string(), enlace: z.string() })),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

const sourceStatus = z.object({ nombre: z.string(), estado: z.enum(["ok", "error"]) }).passthrough();

export type NewsFile = { generadoEn: string; noticias: NewsItem[]; fuentes: z.infer<typeof sourceStatus>[] };

/** Si una noticia viene mal se omite solo esa. */
export function parseNewsFile(json: unknown): NewsFile | null {
  const parsed = z
    .object({ version: z.literal(1), generadoEn: z.string(), noticias: z.array(z.unknown()), fuentes: z.array(sourceStatus) })
    .safeParse(json);
  if (!parsed.success) return null;
  const noticias = parsed.data.noticias.flatMap((item) => {
    const news = newsItemSchema.safeParse(item);
    return news.success ? [news.data] : [];
  });
  return { generadoEn: parsed.data.generadoEn, noticias, fuentes: parsed.data.fuentes };
}

export const eventSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  titulo: z.string(),
  detalle: z.string().optional(),
  pais: z.string(),
  tipo: z.string(),
  importancia: z.enum(["alta", "media"]),
  fuente: z.string(),
  enlace: z.string().url(),
});
export type CalendarEvent = z.infer<typeof eventSchema>;

export type CalendarFile = { generadoEn: string; eventos: CalendarEvent[]; fuentes: z.infer<typeof sourceStatus>[] };

export function parseCalendarFile(json: unknown): CalendarFile | null {
  const parsed = z
    .object({ version: z.literal(1), generadoEn: z.string(), eventos: z.array(z.unknown()), fuentes: z.array(sourceStatus) })
    .safeParse(json);
  if (!parsed.success) return null;
  const eventos = parsed.data.eventos.flatMap((item) => {
    const event = eventSchema.safeParse(item);
    return event.success ? [event.data] : [];
  });
  return { generadoEn: parsed.data.generadoEn, eventos, fuentes: parsed.data.fuentes };
}

export const signalSchema = z.object({
  fecha: z.string(),
  tipo: z.string(),
  prioridad: z.enum(PRIORITIES),
  titulo: z.string(),
  texto: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

export type SignalsFile = { generadoEn: string; senales: Signal[] };

export function parseSignalsFile(json: unknown): SignalsFile | null {
  const parsed = z.object({ version: z.literal(1), generadoEn: z.string(), senales: z.array(z.unknown()) }).safeParse(json);
  if (!parsed.success) return null;
  const senales = parsed.data.senales.flatMap((item) => {
    const signal = signalSchema.safeParse(item);
    return signal.success ? [signal.data] : [];
  });
  return { generadoEn: parsed.data.generadoEn, senales };
}
