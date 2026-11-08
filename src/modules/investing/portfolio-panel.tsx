"use client";

import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { todayInCancun } from "@/lib/dates";
import { formatPercent } from "@/lib/money";
import { useSetting } from "@/lib/settings";
import { useMarketFile } from "@/modules/markets/data";
import { PORTFOLIO_ASSETS, usePurchases } from "./data";
import { monthlyStreak, positions } from "./lib/portfolio";

/** Resumen del portafolio en el Centro de mando. */
export function PortfolioPanel() {
  const purchases = usePurchases();
  const market = useMarketFile();
  const savedRate = useSetting("usdMxnRate");
  const link = (
    <Link href="/inversion" className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
      Ver portafolio
    </Link>
  );

  if (!purchases || !savedRate) return <Panel title="Portafolio S&P 500" action={link} />;
  if (purchases.length === 0) {
    return (
      <Panel title="Portafolio S&P 500" action={link}>
        <EmptyState title="Sin compras registradas" description="Registra tus compras de VOO, IVV o SPY en Inversión para ver lo aportado, lo que vale hoy y tu rendimiento." />
      </Panel>
    );
  }

  const quotes = market.data?.activos ?? {};
  const fx = quotes.usdmxn ? quotes.usdmxn.precio.toFixed(4) : (savedRate.value?.rate ?? null);
  const list = positions(purchases, Object.fromEntries(PORTFOLIO_ASSETS.map((id) => [id, quotes[id]?.precio])), fx);
  const invested = list.reduce((sum, position) => sum + position.investedMxnCents, 0);
  const complete = list.every((position) => position.valueMxnCents !== null);
  const value = complete ? list.reduce((sum, position) => sum + (position.valueMxnCents ?? 0), 0) : null;
  const streak = monthlyStreak(purchases, todayInCancun());

  return (
    <Panel title="Portafolio S&P 500" action={link}>
      <dl className="flex flex-col divide-y divide-borde">
        <div className="flex items-baseline justify-between gap-3 pb-2">
          <dt className="text-interfaz text-texto-2">Vale hoy</dt>
          <dd className="font-serif text-cifra font-semibold">{value === null ? "—" : <Amount cents={value} />}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-interfaz text-texto-2">Aportado</dt>
          <dd className="font-serif text-cifra font-semibold">
            <Amount cents={invested} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-2">
          <dt className="text-interfaz text-texto-2">Ganancia</dt>
          <dd className="text-interfaz">
            {value === null ? "—" : (
              <>
                <Amount cents={value - invested} tone="variacion" />{" "}
                <span className="cifras text-texto-2">({formatPercent(invested > 0 ? (value - invested) / invested : 0, 1)})</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      {streak > 0 ? <p className="text-etiqueta text-texto-2">{streak} {streak === 1 ? "mes" : "meses"} seguidos invirtiendo.</p> : null}
    </Panel>
  );
}
