"use client";

import { Check, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { APP_TIME_ZONE, todayInCancun } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Chip } from "@/modules/finance/transaction-fields";
import { assetById } from "@/modules/markets/catalog";
import type { Quote } from "@/modules/markets/lib/schema";
import { formatAge, formatDataTime } from "@/modules/markets/market-ui";
import { useCalendarFile } from "@/modules/signals/data";
import { putTrade } from "./data";
import { formatRatio, riskReward } from "./lib/calculators";
import { initialRiskCents, maxRiskCents, notionalCents, priceText, quantityProblem, suggestSize, type SimAccountState } from "./lib/trades";
import { quantityDecimals, tradability, TRADABLE_ASSETS } from "./simulator";
import { formatPrice, formatQuantity, tradabilityText, useNow } from "./trading-ui";
import { DECIMAL_PATTERN, DIRECTION_LABELS, DIRECTIONS, EMOTION_LABELS, EMOTIONS, tradeSchema, type Direction, type Emotion, type Trade, type TradingRules } from "./types";

/** Checklist antes de cada operación (§5.4). Los marcados "auto" los revisa la app. */
export const CHECKLIST = [
  { id: "tendencia", label: "Identifiqué la tendencia (alcista, bajista o lateral).", auto: false },
  { id: "nivel", label: "El precio está en un nivel clave (soporte o resistencia).", auto: false },
  { id: "confirmacion", label: "Tengo una confirmación (vela, volumen o indicador).", auto: false },
  { id: "stop", label: "Definí mi stop loss.", auto: true },
  { id: "tamano", label: "Calculé el tamaño de la posición con mi regla de riesgo.", auto: true },
  { id: "rr", label: "El riesgo/beneficio es de al menos 1:2.", auto: true },
  { id: "noticias", label: "Revisé si hoy hay datos económicos o noticias fuertes.", auto: false },
] as const;

const GROUPS = [
  { label: "ETFs", kinds: ["etf"] },
  { label: "Acciones de EE. UU.", kinds: ["accion"] },
  { label: "Cripto", kinds: ["cripto"] },
] as const;

const TIME = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

const clean = (value: string) => value.trim().replace(",", ".");
const isPrice = (value: string) => DECIMAL_PATTERN.test(value) && Number(value) > 0;

/** Nueva operación del simulador: activo, stop, objetivo, tamaño con tu regla y checklist. */
export function OrderSheet({
  rules,
  account,
  quotes,
  blocked,
  strategies,
  onClose,
}: {
  rules: TradingRules;
  account: SimAccountState;
  quotes: Record<string, Quote>;
  blocked: "dia" | "semana" | null;
  strategies: string[];
  onClose: () => void;
}) {
  const now = useNow();
  const calendar = useCalendarFile();
  const listId = useId();
  const [assetId, setAssetId] = useState("spy");
  const [direction, setDirection] = useState<Direction>("largo");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [quantity, setQuantity] = useState<string | null>(null);
  const [strategy, setStrategy] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const asset = assetById(assetId) ?? TRADABLE_ASSETS[0];
  if (!asset || !now) return null;
  const quote = quotes[asset.id];
  const status = tradability(asset, quote, now);
  const entry = quote ? priceText(quote.precio) : null;
  const long = direction === "largo";

  const stopText = clean(stop);
  const targetText = clean(target);
  const stopValid = entry !== null && isPrice(stopText) && (long ? Number(stopText) < Number(entry) : Number(stopText) > Number(entry));
  const targetValid = targetText === "" || (entry !== null && isPrice(targetText) && (long ? Number(targetText) > Number(entry) : Number(targetText) < Number(entry)));
  const rr = entry && stopValid && targetText !== "" && targetValid ? riskReward(Number(entry), Number(stopText), Number(targetText)) : null;
  const suggestion =
    entry && stopValid
      ? suggestSize({ equityCents: account.equityCents, availableCents: account.availableCents, riskPercent: rules.riskPercent, entry, stop: stopText, decimals: quantityDecimals(asset) })
      : null;
  const qty = clean(quantity ?? suggestion?.quantity ?? "");
  const problem =
    entry && stopValid && suggestion
      ? quantityProblem({ quantity: qty, entry, stop: stopText, maxRiskCents: suggestion.maxRiskCents, availableCents: account.availableCents })
      : null;
  const decimalsOk = quantityDecimals(asset) > 0 || /^\d+$/.test(qty);
  const sizeOk = suggestion !== null && problem === null && decimalsOk;
  const riskCents = sizeOk && entry ? initialRiskCents({ entryPrice: entry, stopLoss: stopText, quantity: qty }) : null;

  const auto: Record<string, boolean> = { stop: stopValid, tamano: sizeOk, rr: rr !== null && rr >= 2 };
  const manualDone = CHECKLIST.filter((item) => !item.auto).every((item) => checks[item.id]);
  const checklistComplete = CHECKLIST.every((item) => (item.auto ? auto[item.id] : checks[item.id]));

  const today = todayInCancun(now);
  const todayEvents = (calendar.data?.eventos ?? []).filter((event) => event.importancia === "alta" && todayInCancun(new Date(event.fecha)) === today);

  const open = async () => {
    if (saving || !entry || !quote?.hora) return;
    if (blocked) return setError("Llegaste a tu límite de pérdida: hoy ya no se abren operaciones.");
    if (!status.ok) return setError(tradabilityText(status, now));
    if (!stopValid) return setError(long ? "El stop de una compra va por debajo del precio de entrada." : "El stop de una venta en corto va por encima del precio de entrada.");
    if (!targetValid) return setError(long ? "El objetivo de una compra va por arriba de la entrada." : "El objetivo de una venta en corto va por debajo de la entrada.");
    if (!sizeOk) return setError(sizeMessage(problem, decimalsOk, account.availableCents));
    if (!manualDone) return setError("Completa el checklist antes de entrar.");
    const parsed = tradeSchema.safeParse(
      newSimTrade({
        assetId: asset.id,
        symbol: asset.yahoo ?? asset.id.toUpperCase(),
        direction,
        strategy: strategy.trim(),
        openedAt: Date.parse(quote.hora),
        entryPrice: entry,
        stopLoss: stopText,
        target: targetText === "" ? null : targetText,
        quantity: qty,
        emotion,
        checklistComplete,
      }),
    );
    if (!parsed.success) return setError("Revisa los datos de la operación.");
    setSaving(true);
    try {
      await putTrade(parsed.data);
      onClose();
      showToast({ message: `Abriste ${DIRECTION_LABELS[direction].toLowerCase()} de ${formatQuantity(qty)} ${asset.yahoo ?? asset.nombre} a ${formatPrice(entry, "USD")}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title="Nueva operación"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          {rr !== null && rr < 2 ? <p className="text-etiqueta text-laton">Tu riesgo/beneficio es {formatRatio(rr)}: menor al 1:2 sugerido.</p> : null}
          {targetText === "" && stopValid ? <p className="text-etiqueta text-texto-2">Sin objetivo no se puede medir el riesgo/beneficio.</p> : null}
          <Button size="lg" className="w-full" onClick={() => void open()} disabled={saving || blocked !== null || !status.ok}>
            Abrir operación
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field id="orden-activo" label="Activo">
          <Select
            id="orden-activo"
            value={asset.id}
            onChange={(event) => {
              setAssetId(event.target.value);
              setStop("");
              setTarget("");
              setQuantity(null);
              setError(null);
            }}
          >
            {GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {TRADABLE_ASSETS.filter((item) => (group.kinds as readonly string[]).includes(item.tipo)).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.yahoo ? ` (${item.yahoo})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <div className="rounded-control border border-borde px-3 py-2">
          {quote && entry ? (
            <>
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-etiqueta text-texto-2">Precio de entrada</span>
                <span className="cifras text-titulo font-semibold">{formatPrice(entry, "USD")}</span>
              </p>
              <p className="text-nota text-texto-2">
                {quote.fuente}, {quote.hora ? `${formatDataTime(quote.hora, now)} (${formatAge(quote.hora, now)})` : "sin hora"}
                {quote.retrasoMin ? `, con ${quote.retrasoMin} min de retraso` : ""}. Se registra a este precio.
              </p>
            </>
          ) : (
            <p className="text-etiqueta text-texto-2">Todavía no hay precio publicado de este activo.</p>
          )}
          {!status.ok && quote ? <p className="mt-1 text-etiqueta text-laton">{tradabilityText(status, now)}</p> : null}
        </div>

        <div role="group" aria-label="Dirección" className="grid grid-cols-2 gap-2">
          {DIRECTIONS.map((item) => (
            <Chip
              key={item}
              pressed={direction === item}
              onClick={() => {
                setDirection(item);
                setStop("");
                setTarget("");
                setQuantity(null);
              }}
              className="justify-center"
            >
              {DIRECTION_LABELS[item]}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="orden-stop" label="Stop loss" error={stopText !== "" && !stopValid ? (long ? "Va abajo de la entrada." : "Va arriba de la entrada.") : undefined}>
            <Input id="orden-stop" inputMode="decimal" autoComplete="off" value={stop} onChange={(event) => { setStop(event.target.value); setQuantity(null); }} />
          </Field>
          <Field id="orden-objetivo" label="Objetivo" error={!targetValid ? (long ? "Va arriba de la entrada." : "Va abajo de la entrada.") : undefined}>
            <Input id="orden-objetivo" inputMode="decimal" autoComplete="off" value={target} onChange={(event) => setTarget(event.target.value)} />
          </Field>
        </div>
        {rr !== null ? <p className="-mt-2 text-etiqueta">Riesgo/beneficio: <span className="cifras font-medium">{formatRatio(rr)}</span></p> : null}

        <Field
          id="orden-titulos"
          label={asset.tipo === "cripto" ? "Cantidad" : "Títulos"}
          hint={
            suggestion
              ? `Con tu regla (${rules.riskPercent}% = ${formatMoney(suggestion.maxRiskCents, "USD")}) el máximo es ${formatQuantity(suggestion.quantity)}${suggestion.limitedBy === "efectivo" ? ", limitado por tu dinero disponible" : ""}.`
              : `Escribe tu stop y la app calcula el tamaño: máximo ${formatMoney(maxRiskCents(account.equityCents, rules.riskPercent), "USD")} de riesgo.`
          }
          error={qty !== "" && suggestion && !sizeOk ? sizeMessage(problem, decimalsOk, account.availableCents) : undefined}
        >
          <Input
            id="orden-titulos"
            inputMode="decimal"
            autoComplete="off"
            value={quantity ?? suggestion?.quantity ?? ""}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={!suggestion}
          />
        </Field>
        {riskCents !== null && entry ? (
          <p className="-mt-2 text-etiqueta text-texto-2">
            Arriesgas <span className="cifras text-texto">{formatMoney(riskCents, "USD")}</span> y pones{" "}
            <span className="cifras text-texto">{formatMoney(notionalCents({ entryPrice: entry, quantity: qty }), "USD")}</span>.
          </p>
        ) : null}

        <Field id="orden-estrategia" label="Estrategia" hint="Por ejemplo: ruptura, rebote en soporte, cruce de medias.">
          <Input id="orden-estrategia" list={listId} maxLength={60} autoComplete="off" value={strategy} onChange={(event) => setStrategy(event.target.value)} />
          <datalist id={listId}>
            {strategies.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-etiqueta font-medium text-texto-2">¿Cómo te sientes al entrar?</span>
          <div role="group" aria-label="Emoción" className="flex flex-wrap gap-2">
            {EMOTIONS.map((item) => (
              <Chip key={item} pressed={emotion === item} onClick={() => setEmotion(emotion === item ? null : item)}>
                {EMOTION_LABELS[item]}
              </Chip>
            ))}
          </div>
          {emotion === "fomo" || emotion === "euforia" ? (
            <p className="text-etiqueta text-laton">Con {EMOTION_LABELS[emotion]} es fácil saltarse el plan. Revisa tu checklist con calma.</p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-etiqueta font-medium text-texto-2">Checklist antes de entrar</legend>
          {CHECKLIST.map((item) =>
            item.auto ? (
              <p key={item.id} className="flex min-h-11 items-center gap-3 text-interfaz">
                {auto[item.id] ? <Check aria-hidden className="size-5 shrink-0 text-positivo" /> : <X aria-hidden className="size-5 shrink-0 text-texto-2" />}
                <span className={cn(!auto[item.id] && "text-texto-2")}>
                  {item.label}
                  <span className="sr-only">{auto[item.id] ? " Cumplido." : " Pendiente."}</span>
                </span>
              </p>
            ) : (
              <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-interfaz">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-laton"
                  checked={checks[item.id] ?? false}
                  onChange={(event) => setChecks({ ...checks, [item.id]: event.target.checked })}
                />
                {item.label}
              </label>
            ),
          )}
          {todayEvents.length > 0 ? (
            <ul className="ml-8 flex flex-col gap-0.5 text-etiqueta text-laton">
              {todayEvents.map((event) => (
                <li key={event.id}>
                  Hoy {TIME.format(new Date(event.fecha))}: {event.titulo}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ml-8 text-etiqueta text-texto-2">
              {calendar.data ? "Sin eventos de alto impacto hoy en el calendario." : "Revisa Señales → Calendario."}
            </p>
          )}
        </fieldset>
      </div>
    </Sheet>
  );
}

/** Operación nueva del simulador: abierta, en dólares, sin comisiones y con el diario vacío. */
function newSimTrade(
  fields: Pick<Trade, "assetId" | "symbol" | "direction" | "strategy" | "openedAt" | "entryPrice" | "stopLoss" | "target" | "quantity" | "emotion" | "checklistComplete">,
): Trade {
  const at = Date.now();
  return {
    id: crypto.randomUUID(),
    account: "simulador",
    currency: "USD",
    feesCents: 0,
    status: "abierta",
    closedAt: null,
    exitPrice: null,
    exitReason: null,
    followedPlan: null,
    lesson: "",
    notes: "",
    createdAt: at,
    updatedAt: at,
    ...fields,
  };
}

function sizeMessage(problem: ReturnType<typeof quantityProblem>, decimalsOk: boolean, availableCents: number): string {
  if (!decimalsOk) return "Acciones y ETFs van en títulos enteros.";
  if (problem === "riesgo") return "Con ese tamaño arriesgas más de lo que permite tu regla.";
  if (problem === "efectivo") return `No te alcanza: tienes ${formatMoney(availableCents, "USD")} disponibles.`;
  return "Escribe cuántos títulos.";
}
