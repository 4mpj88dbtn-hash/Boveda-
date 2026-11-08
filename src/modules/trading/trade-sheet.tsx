"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { bytesToBase64 } from "@/lib/backup";
import { APP_TIME_ZONE, cancunInstant, todayInCancun } from "@/lib/dates";
import { compressImage, type CompressedImage } from "@/lib/images";
import { formatMoney, parseAmountToCents } from "@/lib/money";
import { Chip, PhotoField } from "@/modules/finance/transaction-fields";
import { deleteTrade, putTrade, restoreTrade, setTradeImage, useTradeImage, useTradingRules } from "./data";
import { closedPnlCents, initialRiskCents, rMultiple } from "./lib/trades";
import { formatInstant, formatPrice, formatQuantity, formatR, unitsLabel } from "./trading-ui";
import {
  DECIMAL_PATTERN,
  DIRECTION_LABELS,
  DIRECTIONS,
  EMOTION_LABELS,
  EMOTIONS,
  EXIT_REASON_LABELS,
  tradeSchema,
  type Direction,
  type Emotion,
  type Trade,
} from "./types";

type Photo = { kind: "igual" } | { kind: "nueva"; image: CompressedImage; url: string } | { kind: "quitar" };

const TIME = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clean = (value: string) => value.trim().replace(",", ".");
const isPrice = (value: string) => DECIMAL_PATTERN.test(value) && Number(value) > 0;

function splitInstant(ms: number): { date: string; time: string } {
  return { date: todayInCancun(new Date(ms)), time: TIME.format(new Date(ms)) };
}

/** Fecha y hora de este momento en Cancún (valor inicial de una operación nueva). */
function nowParts(): { date: string; time: string } {
  return splitInstant(Date.now());
}

function joinInstant(date: string, time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) return null;
  return cancunInstant(date, Number(match[1]), Number(match[2])).getTime();
}

/**
 * Diario de una operación (§5.2). En las del simulador se completa lo personal (plan, emoción,
 * lección y captura); las reales se registran completas a mano. `trade` null = real nueva.
 */
export function TradeSheet({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  const rules = useTradingRules();
  const image = useTradeImage(trade?.id ?? null);
  const manual = trade === null || trade.account === "real";
  const [initial] = useState(() => {
    const opened = trade ? splitInstant(trade.openedAt) : nowParts();
    return { opened, closed: trade?.closedAt ? splitInstant(trade.closedAt) : opened };
  });
  const opened = initial.opened;
  const closedParts = initial.closed;

  const [symbol, setSymbol] = useState(trade?.symbol ?? "");
  const [direction, setDirection] = useState<Direction>(trade?.direction ?? "largo");
  const [strategy, setStrategy] = useState(trade?.strategy ?? "");
  const [openDate, setOpenDate] = useState(opened.date);
  const [openTime, setOpenTime] = useState(opened.time);
  const [entry, setEntry] = useState(trade?.entryPrice ?? "");
  const [stop, setStop] = useState(trade?.stopLoss ?? "");
  const [target, setTarget] = useState(trade?.target ?? "");
  const [quantity, setQuantity] = useState(trade?.quantity ?? "");
  const [fees, setFees] = useState(trade && trade.feesCents > 0 ? (trade.feesCents / 100).toFixed(2) : "");
  const [isClosed, setIsClosed] = useState(trade ? trade.status === "cerrada" : true);
  const [closeDate, setCloseDate] = useState(closedParts.date);
  const [closeTime, setCloseTime] = useState(closedParts.time);
  const [exit, setExit] = useState(trade?.exitPrice ?? "");
  const [emotion, setEmotion] = useState<Emotion | null>(trade?.emotion ?? null);
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(trade?.followedPlan ?? null);
  const [lesson, setLesson] = useState(trade?.lesson ?? "");
  const [notes, setNotes] = useState(trade?.notes ?? "");
  const [photo, setPhoto] = useState<Photo>({ kind: "igual" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingUrl = useMemo(() => (image ? `data:${image.mimeType};base64,${bytesToBase64(image.data)}` : null), [image]);
  const previewUrl = photo.kind === "nueva" ? photo.url : photo.kind === "quitar" ? null : existingUrl;

  if (!rules) return null;
  const currency = trade?.currency ?? rules.realCurrency;
  const closedNow = manual ? isClosed : trade?.status === "cerrada";

  async function pickPhoto(file: File) {
    setPhotoBusy(true);
    try {
      const compressed = await compressImage(file);
      setPhoto({ kind: "nueva", image: compressed, url: `data:${compressed.mimeType};base64,${bytesToBase64(compressed.data)}` });
    } catch {
      setError("No se pudo leer la imagen. Intenta con otra.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function buildManual(): Trade | string {
    const entryText = clean(entry);
    const stopText = clean(stop);
    const targetText = clean(target);
    const qtyText = clean(quantity);
    const exitText = clean(exit);
    const long = direction === "largo";
    if (symbol.trim() === "") return "Escribe el activo, por ejemplo AAPL o WALMEX.";
    if (!isPrice(entryText)) return "Escribe el precio de entrada con punto decimal, por ejemplo 612.35.";
    if (!isPrice(stopText) || (long ? Number(stopText) >= Number(entryText) : Number(stopText) <= Number(entryText)))
      return long ? "El stop de una compra va por debajo de la entrada." : "El stop de una venta en corto va por encima de la entrada.";
    if (targetText !== "" && (!isPrice(targetText) || (long ? Number(targetText) <= Number(entryText) : Number(targetText) >= Number(entryText))))
      return long ? "El objetivo de una compra va por arriba de la entrada." : "El objetivo de una venta en corto va por debajo de la entrada.";
    if (!isPrice(qtyText)) return "Escribe cuántos títulos.";
    const feesCents = fees.trim() === "" ? { ok: true as const, cents: 0 } : parseAmountToCents(fees);
    if (!feesCents.ok) return feesCents.error;
    const openedAt = joinInstant(openDate, openTime);
    if (openedAt === null) return "Revisa la fecha y la hora de entrada.";
    let closedAt: number | null = null;
    if (isClosed) {
      closedAt = joinInstant(closeDate, closeTime);
      if (closedAt === null || closedAt < openedAt) return "La salida debe ser después de la entrada.";
      if (!isPrice(exitText)) return "Escribe el precio de salida.";
    }
    const now = Date.now();
    return {
      id: trade?.id ?? crypto.randomUUID(),
      account: "real",
      assetId: null,
      symbol: symbol.trim().toUpperCase(),
      currency,
      direction,
      strategy: strategy.trim(),
      openedAt,
      entryPrice: entryText,
      stopLoss: stopText,
      target: targetText === "" ? null : targetText,
      quantity: qtyText,
      feesCents: feesCents.cents,
      status: isClosed ? "cerrada" : "abierta",
      closedAt,
      exitPrice: isClosed ? exitText : null,
      exitReason: isClosed ? (trade?.exitReason ?? "manual") : null,
      emotion,
      followedPlan: isClosed ? followedPlan : null,
      checklistComplete: trade?.checklistComplete ?? false,
      lesson: lesson.trim(),
      notes: notes.trim(),
      createdAt: trade?.createdAt ?? now,
      updatedAt: now,
    };
  }

  async function save() {
    const draft: Trade | string = manual
      ? buildManual()
      : trade
        ? { ...trade, strategy: strategy.trim(), emotion, followedPlan: trade.status === "cerrada" ? followedPlan : null, lesson: lesson.trim(), notes: notes.trim(), updatedAt: Date.now() }
        : "Sin operación.";
    if (typeof draft === "string") return setError(draft);
    const parsed = tradeSchema.safeParse(draft);
    if (!parsed.success) return setError("Revisa los datos de la operación.");
    await putTrade(parsed.data);
    if (photo.kind === "nueva") await setTradeImage(parsed.data.id, photo.image);
    if (photo.kind === "quitar") await setTradeImage(parsed.data.id, null);
    onClose();
    showToast({ message: trade ? "Diario guardado" : "Operación registrada" });
  }

  async function remove() {
    if (!trade) return;
    const removed = await deleteTrade(trade.id);
    onClose();
    showToast({
      message: "Operación eliminada",
      action: { label: "Deshacer", run: () => (removed.trade ? restoreTrade(removed.trade, removed.images) : undefined) },
    });
  }

  const pnl = trade && !manual ? closedPnlCents(trade) : null;
  const r = trade && pnl !== null ? rMultiple(pnl, initialRiskCents(trade)) : null;

  return (
    <Sheet
      title={trade ? `Diario: ${trade.symbol}` : "Registrar operación real"}
      onClose={onClose}
      actions={
        trade ? (
          <Button variant="fantasma" size="icono" aria-label="Eliminar operación" onClick={() => void remove()}>
            <Trash2 aria-hidden className="size-5" />
          </Button>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            {trade ? "Guardar diario" : "Guardar operación"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {!manual && trade ? (
          <div className="flex flex-col gap-1 rounded-control border border-borde px-3 py-2 text-etiqueta">
            <p className="flex items-baseline justify-between gap-3 text-interfaz">
              <span className="font-medium">
                {DIRECTION_LABELS[trade.direction]} · {formatQuantity(trade.quantity)} {unitsLabel(trade)}
              </span>
              {pnl !== null ? <Amount cents={pnl} currency={trade.currency} tone="variacion" className="font-medium" /> : <span className="text-texto-2">Abierta</span>}
            </p>
            <p className="text-texto-2">
              Entrada {formatPrice(trade.entryPrice, trade.currency)} el {formatInstant(trade.openedAt)} · Stop {formatPrice(trade.stopLoss, trade.currency)}
              {trade.target ? ` · Objetivo ${formatPrice(trade.target, trade.currency)}` : ""}
            </p>
            {trade.exitPrice && trade.closedAt ? (
              <p className="text-texto-2">
                {trade.exitReason ? EXIT_REASON_LABELS[trade.exitReason] : "Salida"}: {formatPrice(trade.exitPrice, trade.currency)} el {formatInstant(trade.closedAt)}
                {r !== null ? ` · ${formatR(r)}` : ""}
              </p>
            ) : (
              <p className="text-texto-2">Se cierra desde el Simulador o sola al tocar el stop o el objetivo.</p>
            )}
            <p className="text-texto-2">Checklist {trade.checklistComplete ? "completo" : "incompleto"} al entrar.</p>
          </div>
        ) : null}

        {manual ? (
          <>
            <Field id="real-activo" label="Activo">
              <Input id="real-activo" autoComplete="off" maxLength={40} value={symbol} onChange={(event) => setSymbol(event.target.value)} />
            </Field>
            <div role="group" aria-label="Dirección" className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((item) => (
                <Chip key={item} pressed={direction === item} onClick={() => setDirection(item)} className="justify-center">
                  {DIRECTION_LABELS[item]}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="real-fecha" label="Fecha de entrada">
                <Input id="real-fecha" type="date" value={openDate} onChange={(event) => setOpenDate(event.target.value)} />
              </Field>
              <Field id="real-hora" label="Hora (Cancún)">
                <Input id="real-hora" type="time" value={openTime} onChange={(event) => setOpenTime(event.target.value)} />
              </Field>
              <Field id="real-entrada" label={`Entrada (${currency})`}>
                <Input id="real-entrada" inputMode="decimal" autoComplete="off" value={entry} onChange={(event) => setEntry(event.target.value)} />
              </Field>
              <Field id="real-stop" label="Stop loss">
                <Input id="real-stop" inputMode="decimal" autoComplete="off" value={stop} onChange={(event) => setStop(event.target.value)} />
              </Field>
              <Field id="real-objetivo" label="Objetivo (opcional)">
                <Input id="real-objetivo" inputMode="decimal" autoComplete="off" value={target} onChange={(event) => setTarget(event.target.value)} />
              </Field>
              <Field id="real-titulos" label="Títulos">
                <Input id="real-titulos" inputMode="decimal" autoComplete="off" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </Field>
            </div>
            <Field id="real-comisiones" label={`Comisiones totales (${currency}, opcional)`}>
              <Input id="real-comisiones" inputMode="decimal" autoComplete="off" value={fees} onChange={(event) => setFees(event.target.value)} />
            </Field>
            <div role="group" aria-label="Estado" className="grid grid-cols-2 gap-2">
              <Chip pressed={isClosed} onClick={() => setIsClosed(true)} className="justify-center">
                Ya la cerré
              </Chip>
              <Chip pressed={!isClosed} onClick={() => setIsClosed(false)} className="justify-center">
                Sigue abierta
              </Chip>
            </div>
            {isClosed ? (
              <div className="grid grid-cols-2 gap-3">
                <Field id="real-fecha-salida" label="Fecha de salida">
                  <Input id="real-fecha-salida" type="date" value={closeDate} onChange={(event) => setCloseDate(event.target.value)} />
                </Field>
                <Field id="real-hora-salida" label="Hora (Cancún)">
                  <Input id="real-hora-salida" type="time" value={closeTime} onChange={(event) => setCloseTime(event.target.value)} />
                </Field>
                <Field id="real-salida" label={`Precio de salida (${currency})`}>
                  <Input id="real-salida" inputMode="decimal" autoComplete="off" value={exit} onChange={(event) => setExit(event.target.value)} />
                </Field>
              </div>
            ) : null}
          </>
        ) : null}

        <Field id="diario-estrategia" label="Estrategia">
          <Input id="diario-estrategia" maxLength={60} autoComplete="off" value={strategy} onChange={(event) => setStrategy(event.target.value)} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-etiqueta font-medium text-texto-2">Emoción al entrar</span>
          <div role="group" aria-label="Emoción" className="flex flex-wrap gap-2">
            {EMOTIONS.map((item) => (
              <Chip key={item} pressed={emotion === item} onClick={() => setEmotion(emotion === item ? null : item)}>
                {EMOTION_LABELS[item]}
              </Chip>
            ))}
          </div>
        </div>

        {closedNow ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-etiqueta font-medium text-texto-2">¿Seguiste tu plan?</span>
            <div role="group" aria-label="¿Seguiste tu plan?" className="grid grid-cols-2 gap-2">
              <Chip pressed={followedPlan === true} onClick={() => setFollowedPlan(true)} className="justify-center">
                Sí
              </Chip>
              <Chip pressed={followedPlan === false} onClick={() => setFollowedPlan(false)} className="justify-center">
                No
              </Chip>
            </div>
          </div>
        ) : null}

        <Field id="diario-leccion" label="Lección aprendida">
          <Textarea id="diario-leccion" maxLength={500} value={lesson} onChange={(event) => setLesson(event.target.value)} placeholder="¿Qué harías igual y qué cambiarías?" />
        </Field>
        <Field id="diario-notas" label="Notas (opcional)">
          <Textarea id="diario-notas" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <PhotoField
          label="Captura de la gráfica"
          previewUrl={previewUrl}
          busy={photoBusy}
          onPick={(file) => void pickPhoto(file)}
          onRemove={() => setPhoto({ kind: "quitar" })}
        />
        {manual && trade === null ? <p className="text-nota text-texto-2">Se guarda en {currency === "USD" ? "dólares" : "pesos"}: la moneda de tu cuenta real (Plan → Reglas).</p> : null}
        {manual && trade && trade.feesCents > 0 ? <p className="text-nota text-texto-2">Comisiones: {formatMoney(trade.feesCents, trade.currency)}.</p> : null}
      </div>
    </Sheet>
  );
}
