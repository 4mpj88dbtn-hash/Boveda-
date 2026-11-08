/**
 * Calculadoras de trading (§5.3). Son proyecciones y razones: se calculan con `number` y se
 * redondean solo al mostrar. Cada fórmula tiene un caso verificado a mano en las pruebas.
 */

/** Tamaño de posición: Títulos = (Capital × % de riesgo) / (Entrada − Stop loss). */
export function positionSize(capital: number, riskPercent: number, entry: number, stop: number): number | null {
  const perUnit = Math.abs(entry - stop);
  if (!(capital > 0) || !(riskPercent > 0) || !(perUnit > 0)) return null;
  return (capital * (riskPercent / 100)) / perUnit;
}

/** Dinero máximo que arriesgas por operación: Capital × % de riesgo. */
export function riskAmount(capital: number, riskPercent: number): number {
  return capital * (riskPercent / 100);
}

/**
 * Riesgo/beneficio: (Objetivo − Entrada) / (Entrada − Stop). Sirve igual para cortos (los dos
 * signos se invierten). Devuelve null si el stop y el objetivo no quedan en lados opuestos.
 */
export function riskReward(entry: number, stop: number, target: number): number | null {
  const risk = entry - stop;
  if (risk === 0) return null;
  const ratio = (target - entry) / risk;
  return ratio > 0 && Number.isFinite(ratio) ? ratio : null;
}

/**
 * Esperanza: E = (% aciertos × ganancia promedio) − (% pérdidas × pérdida promedio).
 * `winRate` y `lossRate` van de 0 a 1; la pérdida promedio, en positivo.
 */
export function expectancy(winRate: number, averageWin: number, averageLoss: number, lossRate = 1 - winRate): number {
  return winRate * averageWin - lossRate * Math.abs(averageLoss);
}

/** Factor de beneficio: Ganancias brutas / Pérdidas brutas. Sin pérdidas no se puede calcular. */
export function profitFactor(grossProfit: number, grossLoss: number): number | null {
  const loss = Math.abs(grossLoss);
  return loss > 0 ? grossProfit / loss : null;
}

export type Drawdown = { ratio: number; amount: number; peakIndex: number; troughIndex: number };

/** Drawdown máximo: (Pico − Valle) / Pico, recorriendo la curva de capital en orden. */
export function maxDrawdown(equity: number[]): Drawdown | null {
  if (equity.length < 2) return null;
  let peakIndex = 0;
  let best: Drawdown = { ratio: 0, amount: 0, peakIndex: 0, troughIndex: 0 };
  equity.forEach((value, index) => {
    const peak = equity[peakIndex] ?? value;
    if (value > peak) {
      peakIndex = index;
      return;
    }
    if (peak <= 0) return;
    const ratio = (peak - value) / peak;
    if (ratio > best.ratio) best = { ratio, amount: peak - value, peakIndex, troughIndex: index };
  });
  return best;
}

/** "1:2.4" para mostrar una relación riesgo/beneficio. */
export function formatRatio(ratio: number): string {
  return `1:${ratio.toLocaleString("es-MX", { maximumFractionDigits: 1 })}`;
}
