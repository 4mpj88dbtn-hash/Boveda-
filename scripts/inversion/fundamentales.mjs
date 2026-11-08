#!/usr/bin/env node
/**
 * Fundamentales de empresas grandes (Finnhub, con la clave gratuita FINNHUB_API_KEY). Corre una
 * vez al día dentro del flujo de datos y escribe <carpeta>/fundamentales.json. Sin clave no hace nada.
 *
 * Los nombres de los campos de Finnhub se leen con alternativas; el registro dice cuáles se
 * encontraron para poder revisarlos.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const EMPRESAS = [
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["AMZN", "Amazon"], ["GOOGL", "Alphabet"],
  ["META", "Meta"], ["AVGO", "Broadcom"], ["TSLA", "Tesla"], ["BRK.B", "Berkshire Hathaway"], ["LLY", "Eli Lilly"],
  ["JPM", "JPMorgan Chase"], ["V", "Visa"], ["MA", "Mastercard"], ["UNH", "UnitedHealth"], ["XOM", "Exxon Mobil"],
  ["WMT", "Walmart"], ["COST", "Costco"], ["PG", "Procter & Gamble"], ["JNJ", "Johnson & Johnson"], ["HD", "Home Depot"],
  ["KO", "Coca-Cola"],
];

/** Para cada indicador, los nombres posibles en la respuesta de Finnhub (el primero que exista). */
export const CAMPOS = {
  pe: ["peTTM", "peBasicExclExtraTTM", "peExclExtraTTM", "peNormalizedAnnual"],
  peg: ["pegTTM", "pegRatio"],
  pb: ["pbQuarterly", "pbAnnual", "ptbvQuarterly"],
  evEbitda: ["evEbitdaTTM", "enterpriseValueOverEBITDATTM", "ev/ebitdaTTM"],
  pfcf: ["pfcfShareTTM", "pfcfShareAnnual"],
  grossMargin: ["grossMarginTTM", "grossMarginAnnual"],
  operatingMargin: ["operatingMarginTTM", "operatingMarginAnnual"],
  netMargin: ["netProfitMarginTTM", "netProfitMarginAnnual", "netMarginTTM"],
  roe: ["roeTTM", "roeRfy"],
  roic: ["roiTTM", "roicTTM", "roiAnnual"],
  revenueGrowth1y: ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy"],
  revenueGrowth3y: ["revenueGrowth3Y"],
  revenueGrowth5y: ["revenueGrowth5Y"],
  epsGrowth1y: ["epsGrowthTTMYoy", "epsGrowthQuarterlyYoy"],
  epsGrowth3y: ["epsGrowth3Y"],
  epsGrowth5y: ["epsGrowth5Y"],
  debtEquity: ["totalDebt/totalEquityQuarterly", "totalDebt/totalEquityAnnual", "longTermDebt/equityQuarterly"],
  currentRatio: ["currentRatioQuarterly", "currentRatioAnnual"],
  dividendYield: ["dividendYieldIndicatedAnnual", "currentDividendYieldTTM"],
  payout: ["payoutRatioTTM", "payoutRatioAnnual"],
};

/** Toma el primer campo numérico disponible de cada indicador. */
export function leerMetricas(metric) {
  const resultado = {};
  for (const [clave, nombres] of Object.entries(CAMPOS)) {
    const nombre = nombres.find((candidato) => Number.isFinite(metric?.[candidato]));
    resultado[clave] = nombre ? Math.round(metric[nombre] * 10_000) / 10_000 : null;
  }
  return resultado;
}

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const clave = process.env.FINNHUB_API_KEY ?? "";
  const carpeta = path.resolve(process.argv[2] ?? "datos");
  const archivo = path.join(carpeta, "fundamentales.json");
  if (!clave) {
    console.log("Fundamentales: sin FINNHUB_API_KEY, no se actualizan.");
    return;
  }
  try {
    const anterior = JSON.parse(await readFile(archivo, "utf8"));
    if (Date.now() - Date.parse(anterior.generadoEn) < 20 * 3_600_000) {
      console.log("Fundamentales: al día.");
      return;
    }
  } catch {
    // No existe todavía.
  }
  const empresas = [];
  const encontrados = Object.fromEntries(Object.keys(CAMPOS).map((campo) => [campo, 0]));
  for (const [simbolo, nombre] of EMPRESAS) {
    try {
      const [metricas, perfil] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(simbolo)}&metric=all&token=${clave}`, { signal: AbortSignal.timeout(20_000) }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(simbolo)}&token=${clave}`, { signal: AbortSignal.timeout(20_000) }).then((r) =>
          r.ok ? r.json() : {},
        ),
      ]);
      const valores = leerMetricas(metricas?.metric);
      for (const [campo, valor] of Object.entries(valores)) if (valor !== null) encontrados[campo] += 1;
      empresas.push({ simbolo, nombre, sector: typeof perfil?.finnhubIndustry === "string" ? perfil.finnhubIndustry : null, metricas: valores });
    } catch (error) {
      console.log(`Fundamentales ${simbolo}: ${String(error?.message ?? error).split(clave).join("***")}`);
    }
    await pausa(2_100);
  }
  if (empresas.length === 0) return;
  await writeFile(archivo, `${JSON.stringify({ version: 1, generadoEn: new Date().toISOString(), fuente: "Finnhub", empresas })}\n`);
  console.log(`Fundamentales: ${empresas.length} empresas. Campos encontrados: ${Object.entries(encontrados).map(([campo, total]) => `${campo}=${total}`).join(", ")}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
