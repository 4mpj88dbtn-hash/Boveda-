import { formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

type AmountProps = {
  cents: number;
  currency?: Currency;
  /** "variacion" pinta en jade o carmesí y muestra el signo (+$1,234.56). */
  tone?: "neutro" | "variacion" | "apagado";
  className?: string;
};

/** Un monto de dinero con números tabulares y el formato de México. */
export function Amount({ cents, currency = "MXN", tone = "neutro", className }: AmountProps) {
  const toneClass =
    tone === "variacion"
      ? cents > 0
        ? "text-positivo"
        : cents < 0
          ? "text-negativo-texto"
          : "text-texto-2"
      : tone === "apagado"
        ? "text-texto-2"
        : undefined;

  return (
    <span className={cn("cifras whitespace-nowrap", toneClass, className)}>
      {formatMoney(cents, currency, { signDisplay: tone === "variacion" ? "exceptZero" : "auto" })}
    </span>
  );
}
