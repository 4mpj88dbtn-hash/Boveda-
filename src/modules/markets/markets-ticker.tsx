"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { assetById } from "./catalog";
import { useMarketFile } from "./data";
import { formatQuote, quoteChange } from "./lib/format";
import { formatAge, MarketStatusLine } from "./market-ui";

const TICKER = ["sp500", "nasdaq", "ipc", "btc", "usdmxn"];

const percent = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** Cinta de mercados del Centro de mando: lo esencial, con su fuente y su hora. */
export function MarketsTicker() {
  const market = useMarketFile();
  const file = market.data;
  return (
    <Panel
      title="Mercados"
      action={
        <Link href="/mercados" className="text-etiqueta font-medium text-laton underline-offset-4 hover:underline">
          Ver todo
        </Link>
      }
    >
      <MarketStatusLine className="text-etiqueta" />
      {file ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
          {TICKER.map((id) => {
            const asset = assetById(id);
            const quote = file.activos[id];
            if (!asset) return null;
            const change = quote ? quoteChange(quote.precio, quote.cierreAnterior) : null;
            return (
              <li key={id}>
                <Link href={`/mercados/${id}`} className="flex min-h-11 flex-col justify-center">
                  <span className="text-etiqueta text-texto-2">{asset.nombre}</span>
                  <span className="cifras text-interfaz">
                    {quote ? formatQuote(quote.precio, asset.unidad) : "—"}{" "}
                    {change?.percent !== null && change?.percent !== undefined ? (
                      <span className={cn(change.percent > 0 ? "text-positivo" : change.percent < 0 ? "text-negativo-texto" : "text-texto-2")}>
                        {percent.format(change.percent)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-interfaz text-texto-2">
          {market.status === "error" ? "Sin conexión con los precios. Lo demás funciona igual." : "Cargando precios…"}
        </p>
      )}
      {file ? (
        <p className="text-nota text-texto-2">
          Datos de Yahoo Finance y Coinbase, actualizados {formatAge(file.generadoEn)}. Bitcoin: cambio en 24 horas.
        </p>
      ) : null}
    </Panel>
  );
}
