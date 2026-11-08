"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ALL_ASSETS, assetById } from "@/modules/markets/catalog";
import { useMarketFile } from "@/modules/markets/data";
import { formatQuote } from "@/modules/markets/lib/format";
import { formatAge, formatDataTime } from "@/modules/markets/market-ui";
import { useSignalsFile } from "./data";
import { checkAlerts, DEFAULT_TELEGRAM_CONFIG, telegramConfigText, type PriceAlert, type TelegramConfig } from "./lib/alerts";
import { PriorityTag } from "./signals-header";

/** Señales recientes, alertas de precio del dispositivo y avisos por Telegram. */
export function AlertsView() {
  const signals = useSignalsFile();
  const market = useMarketFile();
  const alerts = useSetting("priceAlerts");
  const telegram = useSetting("telegramConfig");
  const [adding, setAdding] = useState(false);
  const list = alerts?.value ?? [];
  const checks = checkAlerts(list, market.data?.activos ?? {});

  async function remove(alert: PriceAlert) {
    await setSetting("priceAlerts", list.filter((item) => item.id !== alert.id));
    showToast({ message: "Alerta eliminada", action: { label: "Deshacer", run: () => setSetting("priceAlerts", list) } });
  }

  return (
    <>
      <Panel title="Señales recientes">
        {signals.data && signals.data.senales.length > 0 ? (
          <ul className="flex flex-col divide-y divide-borde">
            {signals.data.senales.slice(0, 15).map((signal) => (
              <li key={`${signal.fecha}-${signal.titulo}`} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-interfaz font-medium">{signal.titulo}</span>
                  <PriorityTag priority={signal.prioridad} />
                </span>
                <span className="whitespace-pre-line text-etiqueta text-texto-2">{signal.texto}</span>
                <span className="text-nota text-texto-2">{formatDataTime(signal.fecha)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Sin señales todavía"
            description="Aquí aparecen la pre-apertura, el cierre, los movimientos fuertes y las noticias de alto impacto, con su hora."
          />
        )}
        {signals.data ? <p className="text-nota text-texto-2">Revisadas {formatAge(signals.data.generadoEn)}.</p> : null}
      </Panel>

      <Panel
        title="Mis alertas de precio"
        action={
          <Button variant="fantasma" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-5" />
            Agregar
          </Button>
        }
      >
        <p className="text-etiqueta text-texto-2">
          Viven en este dispositivo y se revisan con cada actualización de precios al abrir la app. Para recibirlas en
          Telegram, inclúyelas abajo en la configuración.
        </p>
        {list.length === 0 ? (
          <EmptyState title="Sin alertas" description="Ejemplo: avísame si VOO baja de 450 o si Bitcoin supera 120,000." />
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {list.map((alert) => {
              const asset = assetById(alert.assetId);
              const check = checks.find((item) => item.alert.id === alert.id);
              return (
                <li key={alert.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-interfaz">
                      {asset?.nombre ?? alert.assetId} {alert.condition === "mayor" ? "sube de" : "baja de"}{" "}
                      <span className="cifras">{asset ? formatQuote(alert.value, asset.unidad) : alert.value}</span>
                    </span>
                    <span className={cn("text-etiqueta", check?.triggered ? "text-laton" : "text-texto-2")}>
                      {check
                        ? `${check.triggered ? "Se cumplió" : "Esperando"} · ahora ${asset ? formatQuote(check.price, asset.unidad) : check.price}`
                        : "Sin precio para revisarla"}
                    </span>
                  </span>
                  <Button variant="fantasma" size="icono" aria-label="Eliminar alerta" onClick={() => void remove(alert)}>
                    <Trash2 aria-hidden className="size-5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {telegram ? <TelegramPanel initial={telegram.value ?? DEFAULT_TELEGRAM_CONFIG} alerts={list} /> : null}

      <EducationalNotice />

      {adding ? <AlertSheet alerts={list} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function AlertSheet({ alerts, onClose }: { alerts: PriceAlert[]; onClose: () => void }) {
  const options = ALL_ASSETS.filter((asset) => !asset.soloHistoria);
  const [assetId, setAssetId] = useState(options[0]?.id ?? "sp500");
  const [condition, setCondition] = useState<PriceAlert["condition"]>("menor");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const number = Number(value.replace(/,/g, ""));
    if (!Number.isFinite(number) || number <= 0) return setError("Escribe un precio mayor a cero.");
    const alert: PriceAlert = { id: crypto.randomUUID(), assetId, condition, value: number, createdAt: Date.now() };
    await setSetting("priceAlerts", [...alerts, alert].slice(-50));
    onClose();
    showToast({ message: "Alerta guardada" });
  }

  return (
    <Sheet
      title="Nueva alerta de precio"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar alerta
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field id="alerta-activo" label="Activo">
          <Select id="alerta-activo" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            {options.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="alerta-condicion" label="Avísame si">
          <Select id="alerta-condicion" value={condition} onChange={(event) => setCondition(event.target.value as PriceAlert["condition"])}>
            <option value="menor">Baja de</option>
            <option value="mayor">Sube de</option>
          </Select>
        </Field>
        <Field id="alerta-valor" label="Precio">
          <Input
            id="alerta-valor"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

/** Campo numérico que deja escribir libremente y guarda solo valores válidos. */
function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  integer,
  placeholder,
  allowEmpty,
  onCommit,
}: {
  id: string;
  label: string;
  value: number | null;
  min: number;
  max: number;
  integer?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        inputMode={integer ? "numeric" : "decimal"}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (allowEmpty && next.trim() === "") return onCommit(null);
          const number = Number(next);
          if (next.trim() !== "" && Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isInteger(number))) {
            onCommit(number);
          }
        }}
      />
    </Field>
  );
}

function TelegramPanel({ initial, alerts }: { initial: TelegramConfig; alerts: PriceAlert[] }) {
  // Estado local: la pantalla responde al instante y se guarda en segundo plano.
  const [config, setConfig] = useState<TelegramConfig>(initial);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const text = telegramConfigText(config, includeAlerts ? alerts : null);

  const update = (changes: Partial<TelegramConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...changes };
      void setSetting("telegramConfig", next);
      return next;
    });
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: "Configuración copiada" });
    } catch {
      showToast({ message: "No se pudo copiar. Selecciona el texto y cópialo." });
    }
  }

  const toggles: { key: "preapertura" | "cierre" | "movimientos" | "noticias"; label: string }[] = [
    { key: "preapertura", label: "Pre-apertura (1 hora antes de que abra Wall Street)" },
    { key: "cierre", label: "Cierre del mercado" },
    { key: "movimientos", label: "Movimientos fuertes" },
    { key: "noticias", label: "Noticias de alto impacto (Fed, Banxico)" },
  ];

  return (
    <Panel title="Avisos en Telegram">
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-interfaz">
        <li>
          En Telegram abre <span className="font-medium">@BotFather</span>, escribe <code className="text-laton">/newbot</code> y sigue los
          pasos. Te da un token: guárdalo en GitHub como secreto <code className="text-laton">TELEGRAM_BOT_TOKEN</code>.
        </li>
        <li>
          Abre tu bot nuevo y tócale <span className="font-medium">Iniciar</span>. Luego abre <span className="font-medium">@userinfobot</span>,
          te dice tu Id: guárdalo como secreto <code className="text-laton">TELEGRAM_CHAT_ID</code>.
        </li>
        <li>
          Elige abajo qué avisos quieres, copia la configuración y pégala en GitHub → Settings → Secrets and variables →
          Actions → pestaña <span className="font-medium">Variables</span> → New repository variable, con el nombre{" "}
          <code className="text-laton">SENALES_CONFIG</code>.
        </li>
      </ol>
      <p className="text-etiqueta text-texto-2">
        Los secretos y las variables de GitHub no son públicos. Tus movimientos y saldos nunca se mandan: solo avisos de
        mercado y tus alertas de precio.
      </p>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-etiqueta font-medium text-texto-2">Qué avisos quieres</legend>
        {toggles.map((toggle) => (
          <label key={toggle.key} className="flex min-h-11 items-center gap-3 text-interfaz">
            <input
              type="checkbox"
              className="size-5 accent-laton"
              checked={config[toggle.key]}
              onChange={(event) => update({ [toggle.key]: event.target.checked })}
            />
            {toggle.label}
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-3 text-interfaz">
          <input type="checkbox" className="size-5 accent-laton" checked={includeAlerts} onChange={(event) => setIncludeAlerts(event.target.checked)} />
          Incluir mis alertas de precio ({alerts.length})
        </label>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["sp500", "nasdaq", "btc", "usdmxn"] as const).map((id) => (
          <NumberSetting
            key={id}
            id={`umbral-${id}`}
            label={`${assetById(id)?.nombre ?? id} ±%`}
            value={config.umbrales[id] ?? null}
            min={0.1}
            max={50}
            onCommit={(value) => value !== null && update({ umbrales: { ...config.umbrales, [id]: value } })}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberSetting
          id="silencio-desde"
          label="Silencio desde (hora)"
          value={config.silencioDesde}
          min={0}
          max={23}
          integer
          onCommit={(value) => value !== null && update({ silencioDesde: value })}
        />
        <NumberSetting
          id="silencio-hasta"
          label="Hasta (hora)"
          value={config.silencioHasta}
          min={0}
          max={23}
          integer
          onCommit={(value) => value !== null && update({ silencioHasta: value })}
        />
        <NumberSetting
          id="max-hora"
          label="Máximo por hora"
          value={config.maxPorHora}
          min={1}
          max={30}
          integer
          onCommit={(value) => value !== null && update({ maxPorHora: value })}
        />
        <NumberSetting
          id="aportacion-dia"
          label="Recordar aportación (día)"
          value={config.aportacionDia}
          min={1}
          max={28}
          integer
          allowEmpty
          placeholder="Ej. 5"
          onCommit={(value) => update({ aportacionDia: value })}
        />
      </div>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-etiqueta font-medium text-texto-2">Prioridades que recibes</legend>
        {(["critica", "importante", "informativa"] as const).map((priority) => (
          <label key={priority} className="flex min-h-11 items-center gap-2 text-interfaz">
            <input
              type="checkbox"
              className="size-5 accent-laton"
              checked={config.prioridades.includes(priority)}
              onChange={(event) => {
                const next = event.target.checked ? [...config.prioridades, priority] : config.prioridades.filter((item) => item !== priority);
                if (next.length > 0) update({ prioridades: next });
              }}
            />
            {priority === "critica" ? "Crítica" : priority === "importante" ? "Importante" : "Informativa"}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="config-texto" className="text-etiqueta font-medium text-texto-2">
          Valor para SENALES_CONFIG
        </label>
        <textarea
          id="config-texto"
          readOnly
          value={text}
          rows={4}
          className="w-full rounded-control border border-borde-control bg-fondo p-3 font-mono text-nota text-texto"
          onFocus={(event) => event.target.select()}
        />
        <Button variant="secundario" className="self-start" onClick={() => void copy()}>
          <Copy aria-hidden className="size-5" />
          Copiar configuración
        </Button>
      </div>
    </Panel>
  );
}
