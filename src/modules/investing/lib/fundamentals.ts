import { z } from "zod";

/**
 * Análisis fundamental con semáforo (§4.4). Cada indicador se compara con la mediana de las
 * demás empresas de la lista (o de su mismo sector si hay al menos tres). Más que una regla, es
 * una guía para hacer mejores preguntas.
 */

export const METRICS = [
  { key: "pe", label: "P/E (precio / utilidad)", group: "Valuación", better: "menor", unit: "x", help: "Cuántos años de utilidades pagas por la acción. Más bajo, más barata." },
  { key: "peg", label: "PEG", group: "Valuación", better: "menor", unit: "x", help: "El P/E ajustado por crecimiento. Cerca de 1 suele considerarse razonable." },
  { key: "pb", label: "P/B (precio / valor en libros)", group: "Valuación", better: "menor", unit: "x", help: "Cuánto pagas por cada peso de patrimonio contable." },
  { key: "evEbitda", label: "EV/EBITDA", group: "Valuación", better: "menor", unit: "x", help: "Valor de la empresa contra lo que genera su operación." },
  { key: "pfcf", label: "Precio / flujo libre", group: "Valuación", better: "menor", unit: "x", help: "Cuánto pagas por el efectivo que de verdad le sobra a la empresa." },
  { key: "grossMargin", label: "Margen bruto", group: "Rentabilidad", better: "mayor", unit: "%", help: "Lo que le queda de cada venta después del costo directo." },
  { key: "operatingMargin", label: "Margen operativo", group: "Rentabilidad", better: "mayor", unit: "%", help: "Lo que le queda después de operar el negocio." },
  { key: "netMargin", label: "Margen neto", group: "Rentabilidad", better: "mayor", unit: "%", help: "Lo que le queda al final, después de todo, incluso impuestos." },
  { key: "roe", label: "ROE", group: "Rentabilidad", better: "mayor", unit: "%", help: "Ganancia sobre el dinero de los accionistas." },
  { key: "roic", label: "ROIC", group: "Rentabilidad", better: "mayor", unit: "%", help: "Ganancia sobre todo el capital invertido en el negocio." },
  { key: "revenueGrowth1y", label: "Ventas, 1 año", group: "Crecimiento", better: "mayor", unit: "%", help: "Cuánto crecieron sus ventas en el último año." },
  { key: "revenueGrowth3y", label: "Ventas, 3 años", group: "Crecimiento", better: "mayor", unit: "%", help: "Crecimiento anual de ventas en 3 años." },
  { key: "revenueGrowth5y", label: "Ventas, 5 años", group: "Crecimiento", better: "mayor", unit: "%", help: "Crecimiento anual de ventas en 5 años." },
  { key: "epsGrowth1y", label: "Utilidad por acción, 1 año", group: "Crecimiento", better: "mayor", unit: "%", help: "Cuánto creció la utilidad por acción en el último año." },
  { key: "epsGrowth3y", label: "Utilidad por acción, 3 años", group: "Crecimiento", better: "mayor", unit: "%", help: "Crecimiento anual de la utilidad por acción en 3 años." },
  { key: "epsGrowth5y", label: "Utilidad por acción, 5 años", group: "Crecimiento", better: "mayor", unit: "%", help: "Crecimiento anual de la utilidad por acción en 5 años." },
  { key: "debtEquity", label: "Deuda / capital", group: "Salud financiera", better: "menor", unit: "x", help: "Cuánta deuda tiene por cada peso de los accionistas." },
  { key: "currentRatio", label: "Liquidez corriente", group: "Salud financiera", better: "mayor", unit: "x", help: "Activos de corto plazo entre deudas de corto plazo. Menos de 1 es una alerta." },
  { key: "dividendYield", label: "Rendimiento por dividendo", group: "Dividendos", better: "mayor", unit: "%", help: "Dividendo anual entre el precio." },
  { key: "payout", label: "Payout (reparto)", group: "Dividendos", better: "menor", unit: "%", help: "Qué parte de la utilidad reparte. Más de 100% no es sostenible." },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];
export type Light = "verde" | "amarillo" | "rojo" | "gris";

const companySchema = z.object({
  simbolo: z.string(),
  nombre: z.string(),
  sector: z.string().nullable(),
  metricas: z.record(z.string(), z.number().nullable()),
});
export type Company = z.infer<typeof companySchema>;

export type FundamentalsFile = { generadoEn: string; fuente: string; empresas: Company[] };

export function parseFundamentalsFile(json: unknown): FundamentalsFile | null {
  const parsed = z.object({ version: z.literal(1), generadoEn: z.string(), fuente: z.string(), empresas: z.array(companySchema) }).safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? null);
}

export type Assessment = { key: MetricKey; value: number | null; peerMedian: number | null; light: Light; reason: string };

/** Semáforo de un indicador: reglas fijas primero, luego contra la mediana de sus pares (±10%). */
export function assess(key: MetricKey, value: number | null, peerMedian: number | null): Assessment {
  const metric = METRICS.find((item) => item.key === key);
  if (!metric || value === null) return { key, value, peerMedian, light: "gris", reason: "Sin dato." };
  if (key === "currentRatio" && value < 1) return { key, value, peerMedian, light: "rojo", reason: "Debe más a corto plazo de lo que tiene disponible." };
  if (key === "payout" && value > 100) return { key, value, peerMedian, light: "rojo", reason: "Reparte más de lo que gana." };
  if (key === "netMargin" && value < 0) return { key, value, peerMedian, light: "rojo", reason: "Está perdiendo dinero." };
  if ((key === "pe" || key === "peg") && value <= 0) return { key, value, peerMedian, light: "rojo", reason: "Sin utilidades: el indicador no aplica." };
  if (peerMedian === null || peerMedian === 0) return { key, value, peerMedian, light: "gris", reason: "Sin con quién comparar." };
  const ratio = (value - peerMedian) / Math.abs(peerMedian);
  const better = metric.better === "mayor" ? ratio > 0.1 : ratio < -0.1;
  const worse = metric.better === "mayor" ? ratio < -0.1 : ratio > 0.1;
  if (better) return { key, value, peerMedian, light: "verde", reason: `Mejor que la mediana de sus pares.` };
  if (worse) return { key, value, peerMedian, light: "rojo", reason: `Peor que la mediana de sus pares.` };
  return { key, value, peerMedian, light: "amarillo", reason: "Parecido a sus pares." };
}

/** Evalúa todas las métricas de una empresa contra su sector (si hay 3+) o contra la lista. */
export function assessCompany(company: Company, all: Company[]): { peers: string; items: Assessment[] } {
  const sameSector = company.sector ? all.filter((other) => other.sector === company.sector) : [];
  const peers = sameSector.length >= 3 ? sameSector : all;
  const items = METRICS.map((metric) => {
    const values = peers
      .filter((other) => other.simbolo !== company.simbolo)
      .map((other) => other.metricas[metric.key])
      .filter((value): value is number => typeof value === "number");
    return assess(metric.key, company.metricas[metric.key] ?? null, median(values));
  });
  return { peers: sameSector.length >= 3 ? `su sector (${company.sector})` : "las demás empresas de la lista", items };
}
