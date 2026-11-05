import Big from "big.js";

/**
 * Dinero en Bóveda: siempre enteros en centavos junto con su moneda.
 * Nunca se guardan montos como decimales de punto flotante.
 */

export const CURRENCIES = ["MXN", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const LOCALE = "es-MX";

/** Lanza un error si el valor no es un número entero de centavos seguro. */
export function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Monto inválido: ${cents}. Se esperaba un entero de centavos.`);
  }
}

/**
 * Redondea al entero más cercano. Si queda justo a la mitad, se aleja de cero
 * (2.5 → 3 y −2.5 → −3). Es la única regla de redondeo de la app.
 */
export function roundHalfUp(value: Big): number {
  return value.round(0, Big.roundHalfUp).toNumber();
}

export type ParseAmountResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

// "1234", "1234.5", "1,234.56", ".75" (comas solo como separador de miles)
const AMOUNT_PATTERN = /^(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d{1,2})?$/;

/**
 * Convierte lo que escribe el usuario a centavos.
 * Acepta "$1,234.56", "1234.5" o ".75". No acepta negativos ni más de 2 decimales:
 * el tipo de movimiento (ingreso o gasto) define el signo.
 */
export function parseAmountToCents(input: string): ParseAmountResult {
  const cleaned = input.trim().replace(/^\$\s*/, "").replace(/\s+/g, "");
  if (cleaned === "" || cleaned === ".") {
    return { ok: false, error: "Escribe un monto." };
  }
  if (!AMOUNT_PATTERN.test(cleaned)) {
    return { ok: false, error: "Escribe el monto con números, por ejemplo 1,234.56." };
  }
  const cents = new Big(cleaned.replace(/,/g, "")).times(100);
  const value = cents.toNumber();
  if (!Number.isSafeInteger(value)) {
    return { ok: false, error: "El monto es demasiado grande." };
  }
  return { ok: true, cents: value };
}

/**
 * Convierte centavos entre MXN y USD.
 * `mxnPerUsd` es el tipo de cambio: cuántos pesos vale 1 dólar (por ejemplo "18.5").
 * Se calcula con decimales exactos y se redondea al centavo una sola vez.
 */
export function convertCents(
  cents: number,
  from: Currency,
  to: Currency,
  mxnPerUsd: Big.BigSource,
): number {
  assertCents(cents);
  if (from === to) return cents;
  const rate = new Big(mxnPerUsd);
  if (rate.lte(0)) {
    throw new RangeError("El tipo de cambio debe ser mayor que cero.");
  }
  const amount = new Big(cents);
  return from === "USD" ? roundHalfUp(amount.times(rate)) : roundHalfUp(amount.div(rate));
}

type FormatMoneyOptions = {
  /** "exceptZero" muestra siempre el signo, útil para variaciones (+$1,234.56). */
  signDisplay?: "auto" | "exceptZero";
};

/** Formato es-MX: MXN `$1,234.56`, USD `USD 1,234.56`. */
export function formatMoney(
  cents: number,
  currency: Currency,
  options: FormatMoneyOptions = {},
): string {
  assertCents(cents);
  const formatter = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: options.signDisplay ?? "auto",
  });
  // Se formatea desde texto para no pasar nunca por un decimal de punto flotante.
  const decimal = new Big(cents).div(100).toFixed(2) as Intl.StringNumericLiteral;
  return formatter.format(decimal);
}

/**
 * Porcentaje con signo: 0.0125 → "+1.25%". Para tasas que no son variaciones (tasa de
 * ahorro) usa `signDisplay: "auto"` → "91.4%".
 */
export function formatPercent(
  ratio: number,
  fractionDigits = 2,
  signDisplay: "exceptZero" | "auto" = "exceptZero",
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay,
  }).format(ratio);
}
