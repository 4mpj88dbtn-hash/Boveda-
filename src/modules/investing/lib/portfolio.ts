import Big from "big.js";
import { roundHalfUp } from "@/lib/money";
import { shiftMonth } from "@/lib/dates";
import { xirr, type CashFlow } from "./calculators";

/**
 * Portafolio del S&P 500. Títulos, precios y tipos de cambio van como texto decimal y se
 * calculan con big.js; los montos se redondean al centavo (mitades hacia arriba).
 */

export type Purchase = {
  id: string;
  date: string;
  assetId: string;
  /** Títulos (permite fracciones), p. ej. "0.512345". */
  shares: string;
  /** Precio por título en USD, p. ej. "612.35". */
  priceUsd: string;
  /** Pesos por 1 dólar el día de la compra. */
  fxRate: string;
  commissionCents: number;
  commissionCurrency: "MXN" | "USD";
  note: string;
  createdAt: number;
};

export type Dividend = {
  id: string;
  date: string;
  assetId: string;
  /** Lo que te depositaron, en centavos de dólar. */
  amountUsdCents: number;
  fxRate: string;
  note: string;
  createdAt: number;
};

const cents = (value: Big) => roundHalfUp(value.times(100));

/** Costo de una compra: títulos × precio (+ comisión), en USD y en MXN. */
export function purchaseCost(purchase: Purchase): { usdCents: number; mxnCents: number; commissionMxnCents: number } {
  const fx = new Big(purchase.fxRate);
  const gross = new Big(purchase.shares).times(purchase.priceUsd);
  const commissionUsd =
    purchase.commissionCurrency === "USD" ? new Big(purchase.commissionCents).div(100) : new Big(purchase.commissionCents).div(100).div(fx);
  const commissionMxn =
    purchase.commissionCurrency === "MXN" ? new Big(purchase.commissionCents).div(100) : new Big(purchase.commissionCents).div(100).times(fx);
  return {
    usdCents: cents(gross.plus(commissionUsd)),
    mxnCents: cents(gross.times(fx).plus(commissionMxn)),
    commissionMxnCents: cents(commissionMxn),
  };
}

export type AssetPosition = {
  assetId: string;
  shares: string;
  investedUsdCents: number;
  investedMxnCents: number;
  /** Costo promedio por título, en USD (con comisiones). */
  averageCostUsd: number;
  valueUsdCents: number | null;
  valueMxnCents: number | null;
  /** Cuánto cambió por el precio del ETF (al tipo de cambio de cada compra). */
  marketEffectMxnCents: number | null;
  /** Cuánto cambió por el tipo de cambio. */
  fxEffectMxnCents: number | null;
  commissionsMxnCents: number;
};

/**
 * Posición por ETF. La ganancia en pesos se separa en:
 *   efecto mercado      = Σ títulos × (precio hoy − precio de compra) × tipo de cambio de compra
 *   efecto tipo de cambio = Σ títulos × precio hoy × (tipo de cambio hoy − tipo de cambio de compra)
 * y se restan las comisiones: ganancia = mercado + tipo de cambio − comisiones.
 */
export function positions(
  purchases: Purchase[],
  pricesUsd: Record<string, number | undefined>,
  currentFx: string | null,
): AssetPosition[] {
  const byAsset = new Map<string, Purchase[]>();
  for (const purchase of purchases) byAsset.set(purchase.assetId, [...(byAsset.get(purchase.assetId) ?? []), purchase]);

  return [...byAsset].map(([assetId, list]) => {
    let shares = new Big(0);
    let investedUsd = 0;
    let investedMxn = 0;
    let commissions = 0;
    let market = new Big(0);
    let fxEffect = new Big(0);
    const price = pricesUsd[assetId];
    for (const purchase of list) {
      const cost = purchaseCost(purchase);
      shares = shares.plus(purchase.shares);
      investedUsd += cost.usdCents;
      investedMxn += cost.mxnCents;
      commissions += cost.commissionMxnCents;
      if (price !== undefined && currentFx !== null) {
        const held = new Big(purchase.shares);
        market = market.plus(held.times(new Big(price).minus(purchase.priceUsd)).times(purchase.fxRate));
        fxEffect = fxEffect.plus(held.times(price).times(new Big(currentFx).minus(purchase.fxRate)));
      }
    }
    const valueUsd = price === undefined ? null : shares.times(price);
    return {
      assetId,
      shares: shares.toString(),
      investedUsdCents: investedUsd,
      investedMxnCents: investedMxn,
      averageCostUsd: shares.gt(0) ? Number(new Big(investedUsd).div(100).div(shares).toFixed(4)) : 0,
      valueUsdCents: valueUsd === null ? null : cents(valueUsd),
      valueMxnCents: valueUsd === null || currentFx === null ? null : cents(valueUsd.times(currentFx)),
      marketEffectMxnCents: price === undefined || currentFx === null ? null : cents(market),
      fxEffectMxnCents: price === undefined || currentFx === null ? null : cents(fxEffect),
      commissionsMxnCents: commissions,
    };
  });
}

/** Dividendos recibidos, en USD y en pesos (al tipo de cambio de cada depósito). */
export function dividendTotals(dividends: Dividend[]): { usdCents: number; mxnCents: number } {
  let usd = 0;
  let mxn = 0;
  for (const dividend of dividends) {
    usd += dividend.amountUsdCents;
    mxn += cents(new Big(dividend.amountUsdCents).div(100).times(dividend.fxRate));
  }
  return { usdCents: usd, mxnCents: mxn };
}

/** Flujos para XIRR en pesos: compras negativas, dividendos y valor de hoy positivos. */
export function portfolioFlows(purchases: Purchase[], dividends: Dividend[], valueMxnCents: number, today: string): CashFlow[] {
  return [
    ...purchases.map((purchase) => ({ date: purchase.date, amount: -purchaseCost(purchase).mxnCents / 100 })),
    ...dividends.map((dividend) => ({ date: dividend.date, amount: new Big(dividend.amountUsdCents).div(100).times(dividend.fxRate).toNumber() })),
    { date: today, amount: valueMxnCents / 100 },
  ];
}

export function portfolioXirr(purchases: Purchase[], dividends: Dividend[], valueMxnCents: number, today: string): number | null {
  if (purchases.length === 0) return null;
  // Con menos de un mes de historia, una tasa anualizada exagera: no se muestra.
  const first = [...purchases].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? today;
  if (Date.parse(today) - Date.parse(first) < 30 * 86_400_000) return null;
  return xirr(portfolioFlows(purchases, dividends, valueMxnCents, today));
}

/**
 * Constancia: meses seguidos con al menos una compra, contando hacia atrás desde este mes.
 * Si este mes aún no compras, la racha sigue viva desde el mes pasado.
 */
export function monthlyStreak(purchases: Pick<Purchase, "date">[], today: string): number {
  const months = new Set(purchases.map((purchase) => purchase.date.slice(0, 7)));
  let month = today.slice(0, 7);
  if (!months.has(month)) month = shiftMonth(month, -1);
  let streak = 0;
  while (months.has(month)) {
    streak += 1;
    month = shiftMonth(month, -1);
  }
  return streak;
}

/** El cierre más reciente en o antes de una fecha, de una serie [segundos, cierre]. */
function closeAt(series: [number, number][], date: string): number | null {
  const limit = Date.parse(`${date}T23:59:59Z`) / 1000;
  let found: number | null = null;
  for (const [time, close] of series) {
    if (time > limit) break;
    found = close;
  }
  return found;
}

/**
 * Lo aportado contra lo que valía al cierre de cada mes, en pesos. Usa los cierres de cada ETF
 * y el tipo de cambio del mismo día (series publicadas).
 */
export function contributedVsValue(
  purchases: Purchase[],
  closesByAsset: Record<string, [number, number][]>,
  fxSeries: [number, number][],
  months: string[],
): { month: string; contributedMxnCents: number; valueMxnCents: number | null }[] {
  return months.map((month) => {
    const [year = 0, monthNumber = 1] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    const held = purchases.filter((purchase) => purchase.date <= lastDay);
    const contributed = held.reduce((sum, purchase) => sum + purchaseCost(purchase).mxnCents, 0);
    const fx = closeAt(fxSeries, lastDay);
    let value: Big | null = new Big(0);
    for (const purchase of held) {
      const close = closeAt(closesByAsset[purchase.assetId] ?? [], lastDay);
      if (close === null || fx === null || value === null) {
        value = null;
        break;
      }
      value = value.plus(new Big(purchase.shares).times(close).times(fx));
    }
    return { month, contributedMxnCents: contributed, valueMxnCents: value === null ? null : cents(value) };
  });
}

export type HistoricalResult = {
  months: number;
  contributed: number;
  value: number;
  shares: number;
  firstDate: string;
  lastDate: string;
  annualized: number | null;
  yearly: { year: number; contributed: number; value: number }[];
};

/**
 * 10. Simulador histórico: invertir `monthly` cada mes desde `fromMonth` ("aaaa-mm") con los
 *     cierres reales de una serie [segundos, cierre]. Compra al primer cierre de cada mes.
 */
export function simulateMonthlyInvesting(series: [number, number][], monthly: number, fromMonth: string): HistoricalResult | null {
  if (series.length < 2 || monthly <= 0) return null;
  const last = series.at(-1);
  if (!last) return null;
  const lastMonth = new Date(last[0] * 1000).toISOString().slice(0, 7);
  const flows: CashFlow[] = [];
  const yearly = new Map<number, { contributed: number; shares: number; lastClose: number }>();
  let shares = 0;
  let contributed = 0;
  let firstDate = "";
  let month = fromMonth;
  let index = 0;
  while (month <= lastMonth) {
    const start = Date.parse(`${month}-01T00:00:00Z`) / 1000;
    while (index < series.length && (series[index]?.[0] ?? 0) < start) index += 1;
    const point = series[index];
    if (!point) break;
    const date = new Date(point[0] * 1000).toISOString().slice(0, 10);
    if (date.slice(0, 7) === month) {
      shares += monthly / point[1];
      contributed += monthly;
      firstDate ||= date;
      flows.push({ date, amount: -monthly });
    }
    month = shiftMonth(month, 1);
  }
  if (contributed === 0) return null;
  // Valor al cierre de cada año (o al último dato).
  let held = 0;
  let invested = 0;
  let pointer = 0;
  const buys = flows.map((flow) => ({ date: flow.date, amount: -flow.amount }));
  for (const [time, close] of series) {
    const date = new Date(time * 1000).toISOString().slice(0, 10);
    while (pointer < buys.length && (buys[pointer]?.date ?? "9999") <= date) {
      const buy = buys[pointer];
      if (buy) {
        held += buy.amount / close;
        invested += buy.amount;
      }
      pointer += 1;
    }
    if (invested > 0) yearly.set(Number(date.slice(0, 4)), { contributed: invested, shares: held, lastClose: close });
  }
  const value = shares * last[1];
  const lastDate = new Date(last[0] * 1000).toISOString().slice(0, 10);
  return {
    months: flows.length,
    contributed,
    value,
    shares,
    firstDate,
    lastDate,
    annualized: xirr([...flows, { date: lastDate, amount: value }]),
    yearly: [...yearly].map(([year, entry]) => ({ year, contributed: entry.contributed, value: entry.shares * entry.lastClose })),
  };
}

/** Une la serie semanal larga con la diaria reciente (la diaria manda donde existe). */
export function mergeSeries(weekly: [number, number][], daily: [number, number][]): [number, number][] {
  const firstDaily = daily[0]?.[0] ?? Number.POSITIVE_INFINITY;
  return [...weekly.filter(([time]) => time < firstDaily), ...daily];
}
