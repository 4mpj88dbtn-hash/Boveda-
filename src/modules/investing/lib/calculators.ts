/**
 * Calculadoras de inversión (§4.2). Son proyecciones: se calculan con `number` y se
 * redondean solo al mostrarlas. Las tasas van en decimal (8% = 0.08).
 */

export type Timing = "fin" | "inicio";

/** Tasa mensual equivalente a una anual: i = (1 + anual)^(1/12) − 1. */
export function monthlyRate(annualRate: number): number {
  return (1 + annualRate) ** (1 / 12) - 1;
}

export type FutureValueInput = {
  initial: number;
  monthly: number;
  annualRate: number;
  months: number;
  /** Si aportas al inicio de cada mes, cada aportación crece un mes más. */
  timing: Timing;
};

/**
 * 1. Interés compuesto con aportaciones mensuales:
 *    VF = VP × (1 + i)^n + A × [((1 + i)^n − 1) / i]   (× (1 + i) si aportas al inicio)
 */
export function futureValue({ initial, monthly, annualRate, months, timing }: FutureValueInput): number {
  const i = monthlyRate(annualRate);
  const growth = (1 + i) ** months;
  if (Math.abs(i) < 1e-12) return initial + monthly * months;
  const annuity = monthly * ((growth - 1) / i) * (timing === "inicio" ? 1 + i : 1);
  return initial * growth + annuity;
}

export type YearRow = { year: number; contributed: number; value: number; earnings: number };

/** 2. Tabla año por año: lo aportado contra lo ganado por rendimientos. */
export function yearlyProjection(input: Omit<FutureValueInput, "months">, years: number): YearRow[] {
  return Array.from({ length: years }, (_, index) => {
    const year = index + 1;
    const value = futureValue({ ...input, months: year * 12 });
    const contributed = input.initial + input.monthly * 12 * year;
    return { year, contributed, value, earnings: value - contributed };
  });
}

/** 3. Rendimiento real: r_real = (1 + r_nominal) / (1 + inflación) − 1. */
export function realRate(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Un monto futuro en pesos de hoy: VF / (1 + inflación)^años. */
export function inTodaysMoney(futureAmount: number, inflation: number, years: number): number {
  return futureAmount / (1 + inflation) ** years;
}

/** 4. CAGR = (final ÷ inicial)^(1 ÷ años) − 1. */
export function cagr(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  return (end / start) ** (1 / years) - 1;
}

export type CashFlow = { date: string; amount: number };

const DAY_MS = 86_400_000;

function yearsBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS / 365;
}

/**
 * 5. XIRR: la tasa anual r que hace cero el valor presente de flujos con fechas:
 *    Σ monto_k / (1 + r)^(días_k / 365) = 0. Aportaciones negativas, valor final positivo.
 *    Newton-Raphson con respaldo de bisección. Devuelve null si no hay solución.
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2 || !flows.some((flow) => flow.amount > 0) || !flows.some((flow) => flow.amount < 0)) return null;
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]?.date ?? "";
  const terms = sorted.map((flow) => ({ t: yearsBetween(first, flow.date), amount: flow.amount }));
  const npv = (rate: number) => terms.reduce((sum, term) => sum + term.amount / (1 + rate) ** term.t, 0);
  const derivative = (rate: number) => terms.reduce((sum, term) => sum - (term.t * term.amount) / (1 + rate) ** (term.t + 1), 0);

  let rate = 0.1;
  for (let step = 0; step < 100; step += 1) {
    const value = npv(rate);
    const slope = derivative(rate);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || slope === 0) break;
    const next = rate - value / slope;
    if (next <= -0.9999 || !Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  // Bisección entre −99.99% y 10,000% anual.
  let low = -0.9999;
  let high = 100;
  let lowValue = npv(low);
  if (lowValue * npv(high) > 0) return null;
  for (let step = 0; step < 300; step += 1) {
    const middle = (low + high) / 2;
    const value = npv(middle);
    if (Math.abs(value) < 1e-9 || high - low < 1e-12) return middle;
    if (value * lowValue < 0) high = middle;
    else {
      low = middle;
      lowValue = value;
    }
  }
  return (low + high) / 2;
}

/** 6. Regla del 72: años para duplicar ≈ 72 ÷ tasa (%). También el cálculo exacto: ln 2 ÷ ln(1 + r). */
export function ruleOf72(annualRate: number): { approx: number; exact: number } | null {
  if (annualRate <= 0) return null;
  return { approx: 72 / (annualRate * 100), exact: Math.log(2) / Math.log(1 + annualRate) };
}

/** 7. Costo promedio (DCA) = total invertido ÷ total de títulos. */
export function averageCost(purchases: { amount: number; shares: number }[]): number | null {
  const shares = purchases.reduce((sum, purchase) => sum + purchase.shares, 0);
  if (shares <= 0) return null;
  return purchases.reduce((sum, purchase) => sum + purchase.amount, 0) / shares;
}

/**
 * 8. Impacto de comisiones: la comisión anual se cobra sobre lo que tienes, así que el
 *    rendimiento neto es (1 + r) × (1 − comisión) − 1.
 */
export function netOfFees(annualRate: number, annualFee: number): number {
  return (1 + annualRate) * (1 - annualFee) - 1;
}

export function feeImpact(input: Omit<FutureValueInput, "annualRate" | "months">, annualRate: number, fees: number[], years: number[]) {
  return fees.map((fee) => ({
    fee,
    values: years.map((year) => ({ year, value: futureValue({ ...input, annualRate: netOfFees(annualRate, fee), months: year * 12 }) })),
  }));
}

/**
 * 9. ¿Cuánto invertir al mes para llegar a VF en n meses?
 *    A = (VF − VP × (1 + i)^n) × i / ((1 + i)^n − 1)   (÷ (1 + i) si aportas al inicio)
 *    Si con lo que ya tienes alcanza, la respuesta es 0.
 */
export function requiredMonthly({
  target,
  initial,
  annualRate,
  months,
  timing,
}: {
  target: number;
  initial: number;
  annualRate: number;
  months: number;
  timing: Timing;
}): number {
  if (months <= 0) return Math.max(0, target - initial);
  const i = monthlyRate(annualRate);
  const growth = (1 + i) ** months;
  const missing = target - initial * growth;
  if (missing <= 0) return 0;
  if (Math.abs(i) < 1e-12) return missing / months;
  return (missing * i) / (growth - 1) / (timing === "inicio" ? 1 + i : 1);
}
