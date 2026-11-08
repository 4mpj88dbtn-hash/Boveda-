/**
 * Indicadores técnicos sobre precios de cierre. Devuelven un arreglo del mismo largo que la
 * entrada, con `null` donde todavía no hay suficientes datos. Se calculan con `number`: son
 * análisis, no dinero del usuario.
 */

/** Media móvil simple de `period` cierres. */
export function sma(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  values.forEach((value, index) => {
    sum += value;
    if (index >= period) sum -= values[index - period] ?? 0;
    result.push(index >= period - 1 ? sum / period : null);
  });
  return result;
}

/** Media móvil exponencial: arranca con la media simple de los primeros `period` valores. */
export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let previous: number | null = null;
  values.forEach((value, index) => {
    if (index < period - 1) {
      result.push(null);
      return;
    }
    if (previous === null) {
      previous = values.slice(0, period).reduce((sum, item) => sum + item, 0) / period;
    } else {
      previous = value * k + previous * (1 - k);
    }
    result.push(previous);
  });
  return result;
}

/**
 * RSI de Wilder (por defecto 14): 100 − 100 / (1 + ganancia promedio / pérdida promedio).
 * La primera media es simple; después se suaviza: (anterior × (n − 1) + actual) / n.
 */
export function rsi(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = values.map(() => null);
  if (values.length <= period) return result;
  let gain = 0;
  let loss = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = (values[index] ?? 0) - (values[index - 1] ?? 0);
    if (change >= 0) gain += change;
    else loss -= change;
  }
  gain /= period;
  loss /= period;
  const value = () => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  result[period] = value();
  for (let index = period + 1; index < values.length; index += 1) {
    const change = (values[index] ?? 0) - (values[index - 1] ?? 0);
    gain = (gain * (period - 1) + Math.max(change, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = value();
  }
  return result;
}

export type Macd = { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };

/** MACD (12, 26, 9): EMA rápida − EMA lenta; la señal es la EMA de 9 del MACD. */
export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): Macd {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, index) => {
    const a = fastEma[index];
    const b = slowEma[index];
    return a === null || a === undefined || b === null || b === undefined ? null : a - b;
  });
  const start = line.findIndex((value) => value !== null);
  const signal: (number | null)[] = values.map(() => null);
  if (start >= 0) {
    const defined = line.slice(start) as number[];
    ema(defined, signalPeriod).forEach((value, offset) => {
      signal[start + offset] = value;
    });
  }
  const histogram = line.map((value, index) => {
    const s = signal[index];
    return value === null || s === null || s === undefined ? null : value - s;
  });
  return { macd: line, signal, histogram };
}
