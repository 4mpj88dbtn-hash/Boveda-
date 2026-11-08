"use client";

import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ALL_ASSETS, assetById } from "@/modules/markets/catalog";
import { formatAge, formatDataTime } from "@/modules/markets/market-ui";
import { useNewsFile } from "./data";
import type { NewsItem } from "./lib/schema";
import { PriorityTag } from "./signals-header";

const TOPICS = [
  { id: "todas", label: "Todas" },
  { id: "fed", label: "Fed" },
  { id: "banxico", label: "Banxico" },
  { id: "mexico", label: "México" },
  { id: "economia-eeuu", label: "EE. UU." },
  { id: "mercados", label: "Mercados" },
  { id: "cripto", label: "Cripto" },
  { id: "guardadas", label: "Guardadas" },
] as const;

type SavedNews = { id: string; titulo: string; enlace: string; fuente: string; fecha: string | null; guardadaEn: number };

/** Feed financiero: titular, fuente, hora, activos y enlace al original. */
export function NewsView() {
  const news = useNewsFile();
  const read = useSetting("newsRead");
  const saved = useSetting("newsSaved");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("todas");
  const [asset, setAsset] = useState("");

  const readIds = new Set(read?.value ?? []);
  const savedList = saved?.value ?? [];
  const savedIds = new Set(savedList.map((item) => item.id));
  const items: (NewsItem | SavedNews)[] =
    topic === "guardadas"
      ? savedList
      : (news.data?.noticias ?? []).filter(
          (item) => (topic === "todas" || item.temas.includes(topic)) && (asset === "" || item.activos.includes(asset)),
        );

  async function markRead(ids: string[]) {
    const next = [...new Set([...(read?.value ?? []), ...ids])].slice(-500);
    await setSetting("newsRead", next);
  }

  async function toggleSave(item: NewsItem | SavedNews) {
    if (savedIds.has(item.id)) {
      await setSetting("newsSaved", savedList.filter((entry) => entry.id !== item.id));
    } else {
      const entry: SavedNews = { id: item.id, titulo: item.titulo, enlace: item.enlace, fuente: item.fuente, fecha: item.fecha, guardadaEn: Date.now() };
      await setSetting("newsSaved", [entry, ...savedList].slice(0, 100));
    }
  }

  const assetsWithNews = ALL_ASSETS.filter((option) => (news.data?.noticias ?? []).some((item) => item.activos.includes(option.id)));

  return (
    <>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Tema" className="-mx-1 flex gap-1 overflow-x-auto">
          {TOPICS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={topic === option.id}
              onClick={() => setTopic(option.id)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-etiqueta font-medium transition-colors duration-120 ease-boveda",
                topic === option.id ? "border-laton text-texto" : "border-borde text-texto-2 hover:text-texto",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {topic !== "guardadas" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Activo" value={asset} onChange={(event) => setAsset(event.target.value)} className="min-w-0 flex-1 basis-48">
              <option value="">Todos los activos</option>
              {assetsWithNews.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nombre}
                </option>
              ))}
            </Select>
            <Button
              variant="fantasma"
              disabled={items.every((item) => readIds.has(item.id))}
              onClick={() => void markRead(items.map((item) => item.id))}
            >
              Marcar todas como leídas
            </Button>
          </div>
        ) : null}
      </div>

      {news.status === "cargando" && !news.data ? <p className="text-interfaz text-texto-2">Cargando noticias…</p> : null}
      {news.status === "error" && !news.data ? (
        <EmptyState title="No se pudieron cargar las noticias" description="Revisa tu conexión. Lo demás de la app funciona igual." />
      ) : null}

      {items.length === 0 && (news.data || topic === "guardadas") ? (
        <EmptyState
          title={topic === "guardadas" ? "Sin noticias guardadas" : "Nada con ese filtro"}
          description={topic === "guardadas" ? "Toca el marcador de una noticia para guardarla aquí." : "Cambia el tema o el activo."}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-borde rounded-tarjeta border border-borde bg-superficie">
          {items.map((item) => {
            const isRead = readIds.has(item.id);
            const full = "temas" in item ? item : null;
            return (
              <li key={item.id} className="flex gap-2 px-3 py-3">
                <a
                  href={item.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void markRead([item.id])}
                  className="flex min-w-0 flex-1 flex-col gap-1"
                >
                  <span className={cn("text-interfaz", isRead ? "text-texto-2" : "text-texto font-medium")}>
                    {item.titulo}
                    <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-baseline text-texto-2" />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-etiqueta text-texto-2">
                    <span>{item.fuente}</span>
                    {item.fecha ? <span>· {formatDataTime(item.fecha)}</span> : null}
                    {full && full.otrasFuentes.length > 0 ? <span>· también en {full.otrasFuentes.map((other) => other.fuente).join(", ")}</span> : null}
                  </span>
                  {full && (full.prioridad !== "informativa" || full.activos.length > 0) ? (
                    <span className="flex flex-wrap gap-1.5">
                      {full.prioridad !== "informativa" ? <PriorityTag priority={full.prioridad} /> : null}
                      {full.activos.slice(0, 4).map((id) => (
                        <span key={id} className="inline-flex h-6 items-center rounded-full bg-elevada px-2 text-nota text-texto-2">
                          {assetById(id)?.nombre ?? id}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </a>
                <Button
                  variant="fantasma"
                  size="icono"
                  aria-label={savedIds.has(item.id) ? "Quitar de guardadas" : "Guardar noticia"}
                  aria-pressed={savedIds.has(item.id)}
                  onClick={() => void toggleSave(item)}
                >
                  {savedIds.has(item.id) ? (
                    <BookmarkCheck aria-hidden className="size-5 text-laton" />
                  ) : (
                    <Bookmark aria-hidden className="size-5" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {news.data ? (
        <p className="text-nota text-texto-2">
          Actualizadas {formatAge(news.data.generadoEn)}. Fuentes:{" "}
          {[...new Set(news.data.fuentes.filter((source) => source.estado === "ok").map((source) => source.nombre))].join(", ")}. Los
          titulares van en el idioma original y enlazan a la nota completa.
        </p>
      ) : null}
      <EducationalNotice />
    </>
  );
}
