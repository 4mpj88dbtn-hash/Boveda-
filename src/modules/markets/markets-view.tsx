"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { setSetting, useSetting } from "@/lib/settings";
import { FIXED_ASSETS, WATCHLIST_OPTIONS, assetById, requiredKey, type Asset } from "./catalog";
import { useMarketFile } from "./data";
import { formatAge, formatDataTime, MarketStatusLine, QuoteCard } from "./market-ui";
import type { MarketFile } from "./lib/schema";

const GROUPS = ["Índices", "Cripto", "Divisas", "Materias primas", "Volatilidad y tasas"];

/** Pantalla Mercados: estado de la bolsa, watchlist principal y la tuya. */
export function MarketsView() {
  const market = useMarketFile();
  const watchlist = useSetting("watchlist");
  const [editing, setEditing] = useState(false);
  const file = market.data;
  const mine = (watchlist?.value ?? []).map((id) => assetById(id)).filter((asset): asset is Asset => Boolean(asset));
  const missing = FIXED_ASSETS.filter((asset) => requiredKey(asset) && !file?.activos[asset.id]);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display lg:text-display-lg">Mercados</h1>
        <MarketStatusLine />
        <Freshness file={file} status={market.status} />
      </header>

      {market.status === "cargando" && !file ? <p className="text-interfaz text-texto-2">Cargando precios…</p> : null}
      {market.status === "error" && !file ? (
        <EmptyState
          title="No se pudieron cargar los precios"
          description="Revisa tu conexión. El resto de la app funciona igual; los precios aparecen cuando vuelva el internet."
        />
      ) : null}

      {file
        ? GROUPS.map((group) => (
            <section key={group} aria-labelledby={`grupo-${group}`} className="flex flex-col gap-3">
              <h2 id={`grupo-${group}`} className="text-titulo">
                {group}
              </h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-3">
                {FIXED_ASSETS.filter((asset) => asset.grupo === group).map((asset) => (
                  <QuoteCard key={asset.id} asset={asset} quote={file.activos[asset.id]} />
                ))}
              </div>
            </section>
          ))
        : null}

      <Panel
        title="Mi watchlist"
        action={
          <Button variant="fantasma" onClick={() => setEditing(true)}>
            Editar
          </Button>
        }
      >
        {mine.length === 0 ? (
          <EmptyState
            title="Agrega los activos que sigues"
            description="ETFs, acciones de EE. UU. y de México, y cripto. Toca Editar para elegirlos."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {mine.map((asset) => (
              <QuoteCard key={asset.id} asset={asset} quote={file?.activos[asset.id]} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Comparar activos">
        <p className="text-interfaz text-texto-2">
          Pon varios activos en base 100 para ver cuál rindió más en el mismo periodo.
        </p>
        <Link href="/mercados/comparar" className="text-interfaz font-medium text-laton underline-offset-4 hover:underline">
          Abrir el comparador
        </Link>
      </Panel>

      {missing.length > 0 ? <MissingKeys assets={missing} /> : null}

      <EducationalNotice />

      {editing ? (
        <WatchlistSheet selected={watchlist?.value ?? []} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}

function Freshness({ file, status }: { file: MarketFile | null; status: "cargando" | "listo" | "error" }) {
  if (!file) return null;
  const sources = [...new Set(Object.values(file.activos).map((quote) => quote.fuente))].join(", ");
  return (
    <p className="text-etiqueta text-texto-2">
      {status === "error" ? "Sin conexión: datos guardados. " : ""}
      Actualizado {formatAge(file.generadoEn)} ({formatDataTime(file.generadoEn)}). Fuentes: {sources}. Se actualizan cada
      20 minutos en horario de mercado y cada 3 horas fuera de él; cada tarjeta dice la hora de su dato.
    </p>
  );
}

function MissingKeys({ assets }: { assets: Asset[] }) {
  const needsBanxico = assets.some((asset) => requiredKey(asset) === "BANXICO_TOKEN");
  const needsFred = assets.some((asset) => requiredKey(asset) === "FRED_API_KEY");
  return (
    <Panel title="Datos que necesitan una clave gratuita">
      <p className="text-interfaz text-texto-2">
        {assets.map((asset) => asset.nombre).join(", ")}. Las claves se guardan en GitHub, nunca en la app: en tu
        repositorio entra a Settings → Secrets and variables → Actions → New repository secret.
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-interfaz">
        {needsBanxico ? (
          <li>
            <span className="font-medium">Banxico (FIX y tasa objetivo):</span> pide tu token en banxico.org.mx/SieAPIRest/service/v1/token
            y guárdalo con el nombre <code className="text-laton">BANXICO_TOKEN</code>.
          </li>
        ) : null}
        {needsFred ? (
          <li>
            <span className="font-medium">FRED (tasa de la Fed):</span> crea una cuenta en fred.stlouisfed.org, pide una API key y
            guárdala con el nombre <code className="text-laton">FRED_API_KEY</code>.
          </li>
        ) : null}
      </ol>
    </Panel>
  );
}

function WatchlistSheet({ selected, onClose }: { selected: string[]; onClose: () => void }) {
  const [chosen, setChosen] = useState<string[]>(selected);
  const groups = [...new Set(WATCHLIST_OPTIONS.map((asset) => asset.grupo))];

  async function save() {
    await setSetting("watchlist", chosen);
    onClose();
  }

  return (
    <Sheet
      title="Mi watchlist"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" onClick={() => void save()}>
          Guardar ({chosen.length})
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <fieldset key={group} className="flex flex-col gap-1">
            <legend className="mb-1 text-etiqueta font-medium text-texto-2">{group}</legend>
            {WATCHLIST_OPTIONS.filter((asset) => asset.grupo === group).map((asset) => (
              <label key={asset.id} className="flex min-h-11 items-center gap-3 text-interfaz">
                <input
                  type="checkbox"
                  className="size-5 accent-laton"
                  checked={chosen.includes(asset.id)}
                  onChange={(event) =>
                    setChosen((list) => (event.target.checked ? [...list, asset.id] : list.filter((id) => id !== asset.id)))
                  }
                />
                {asset.nombre}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}
