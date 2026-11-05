import Big from "big.js";
import type { Currency } from "@/lib/money";

/**
 * Teclado del registro rápido. Lo escrito se guarda como texto ("1234.5") y solo se
 * convierte a centavos al final, sin pasar por decimales de punto flotante.
 */

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "borrar";

/** Hasta $999,999,999.99: suficiente y siempre dentro de los enteros seguros. */
const MAX_INTEGER_DIGITS = 9;

export function pressKey(value: string, key: KeypadKey): string {
  if (key === "borrar") return value.slice(0, -1);
  const [integer = "", decimals] = value.split(".");
  if (key === ".") {
    if (decimals !== undefined) return value;
    return integer === "" ? "0." : `${value}.`;
  }
  if (decimals !== undefined) return decimals.length >= 2 ? value : value + key;
  if (integer === "0") return key; // sin ceros a la izquierda
  if (integer.length >= MAX_INTEGER_DIGITS) return value;
  return value + key;
}

/** "1234.5" → 123450 centavos. Vacío → 0. */
export function keypadToCents(value: string): number {
  const cleaned = value.endsWith(".") ? value.slice(0, -1) : value;
  if (cleaned === "") return 0;
  return new Big(cleaned).times(100).toNumber();
}

/** Para editar un monto guardado: 25000 → "250", 25050 → "250.50". */
export function centsToKeypad(cents: number): string {
  const amount = new Big(cents).div(100);
  return cents % 100 === 0 ? amount.toFixed(0) : amount.toFixed(2);
}

const groupInteger = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** Muestra lo escrito tal cual, con separador de miles: "1234.5" → "$1,234.5". */
export function formatKeypad(value: string, currency: Currency): string {
  const [integer = "", decimals] = value.split(".");
  const grouped = groupInteger.format(BigInt(integer === "" ? "0" : integer));
  const prefix = currency === "MXN" ? "$" : "USD ";
  return `${prefix}${grouped}${decimals !== undefined ? `.${decimals}` : ""}`;
}
