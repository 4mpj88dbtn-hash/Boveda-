"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { useSetting } from "@/lib/settings";
import { assetById } from "@/modules/markets/catalog";
import { useMarketFile } from "@/modules/markets/data";
import { formatQuote } from "@/modules/markets/lib/format";
import { formatDataTime } from "@/modules/markets/market-ui";
import { useNewsFile, useSignalsFile } from "./data";
import { checkAlerts } from "./lib/alerts";
import { PriorityTag } from "./signals-header";

const linkClass = "text-etiqueta font-medium text-laton underline-offset-4 hover:underline";

/** Señales del Centro de mando: tus alertas cumplidas y los últimos avisos de mercado. */
export function SignalsPanel() {
  const signals = useSignalsFile();
  const market = useMarketFile();
  const alerts = useSetting("priceAlerts");
  const triggered = checkAlerts(alerts?.value ?? [], market.data?.activos ?? {}).filter((check) => check.triggered);
  const latest = signals.data?.senales.slice(0, 3) ?? [];

  return (
    <Panel title="Señales recientes" action={<Link href="/senales" className={linkClass}>Ver todo</Link>}>
      {triggered.length === 0 && latest.length === 0 ? (
        <EmptyState
          title="Sin señales por ahora"
          description="Aquí verás tus alertas de precio cumplidas, la pre-apertura, el cierre y los movimientos fuertes."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {triggered.map(({ alert, price }) => {
            const asset = assetById(alert.assetId);
            return (
              <li key={alert.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                <span className="text-interfaz font-medium text-laton">Tu alerta se cumplió</span>
                <span className="text-etiqueta text-texto-2">
                  {asset?.nombre ?? alert.assetId} {alert.condition === "mayor" ? "superó" : "bajó de"}{" "}
                  {asset ? formatQuote(alert.value, asset.unidad) : alert.value}: ahora {asset ? formatQuote(price, asset.unidad) : price}
                </span>
              </li>
            );
          })}
          {latest.map((signal) => (
            <li key={`${signal.fecha}-${signal.titulo}`} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
              <span className="flex items-center justify-between gap-2">
                <span className="text-interfaz font-medium">{signal.titulo}</span>
                <PriorityTag priority={signal.prioridad} />
              </span>
              <span className="line-clamp-2 text-etiqueta text-texto-2">{signal.texto.split("\n").slice(1).join(" · ")}</span>
              <span className="text-nota text-texto-2">{formatDataTime(signal.fecha)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Noticias del Centro de mando: primero las de mayor prioridad. */
export function NewsPanel() {
  const news = useNewsFile();
  const items = [...(news.data?.noticias ?? [])]
    .sort((a, b) => {
      const rank = { critica: 0, importante: 1, informativa: 2 };
      return rank[a.prioridad] - rank[b.prioridad] || Date.parse(b.fecha ?? "0") - Date.parse(a.fecha ?? "0");
    })
    .slice(0, 4);

  return (
    <Panel title="Noticias" action={<Link href="/senales/noticias" className={linkClass}>Ver todo</Link>}>
      {items.length === 0 ? (
        <EmptyState
          title={news.status === "error" ? "Sin conexión con las noticias" : "Cargando noticias…"}
          description="Noticias de la Fed, Banxico, mercados y cripto, con su fuente y su hora."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {items.map((item) => (
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <a href={item.enlace} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5">
                <span className="text-interfaz hover:underline">{item.titulo}</span>
                <span className="text-nota text-texto-2">
                  {item.fuente}
                  {item.fecha ? ` · ${formatDataTime(item.fecha)}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
