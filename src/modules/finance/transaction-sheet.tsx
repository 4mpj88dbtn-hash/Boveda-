"use client";

import { ChevronDown, Delete, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Label, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { bytesToBase64 } from "@/lib/backup";
import { formatDate, monthRange, todayInCancun } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { compressImage, type CompressedImage } from "@/lib/images";
import { convertCents, formatMoney, type Currency } from "@/lib/money";
import { setSetting, useSetting, type Settings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  nextOrder,
  putRecurring,
  putTemplate,
  putTransaction,
  removeTransaction,
  replaceAttachment,
  useAccounts,
  useAttachments,
  useCategories,
  useLastTransaction,
  useTemplates,
} from "./data";
import { rootCategoryId, spendingByRootCategory, thresholdCrossed } from "./lib/budgets";
import { centsToKeypad, formatKeypad, keypadToCents, pressKey, type KeypadKey } from "./lib/keypad";
import { nextOccurrenceAfter } from "./lib/recurrence";
import {
  buildTransaction,
  isValidRate,
  needsFxRate,
  type DraftField,
  type FxInput,
  type TransactionDraft,
} from "./lib/transactions";
import { runRecurring } from "./recurring-runner";
import { closeTransactionSheet, useTransactionSheet, type MovementPreset, type SheetRequest } from "./sheet-store";
import { CategoryPicker, Chip, PhotoField, QuickChips, TransferAccounts } from "./transaction-fields";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  movementTemplateSchema,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  RECURRING_MODE_LABELS,
  RECURRING_MODES,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  type Account,
  type Attachment,
  type Category,
  type Frequency,
  type PaymentMethod,
  type RecurringMode,
  type Template,
  type Transaction,
  type TransactionType,
} from "./types";

/** Se monta una sola vez en el marco de la app; abre la hoja cuando alguien la pide. */
export function TransactionSheetHost() {
  const request = useTransactionSheet();
  // Si la app se bloquea con la hoja abierta, se cierra.
  useEffect(() => closeTransactionSheet, []);
  if (!request) return null;
  return <SheetLoader key={request.key} request={request} />;
}

function SheetLoader({ request }: { request: SheetRequest }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const templates = useTemplates();
  const last = useLastTransaction();
  const savedRate = useSetting("usdMxnRate");
  const attachments = useAttachments(request.kind === "editar" ? request.transaction.id : null);
  if (!accounts || !categories || !templates || last === undefined || !savedRate || !attachments) return null;
  return (
    <TransactionSheet
      request={request}
      accounts={accounts}
      categories={categories}
      templates={templates}
      last={last}
      savedRate={savedRate.value ?? null}
      attachment={attachments[0] ?? null}
    />
  );
}

const SAVED_LABEL: Record<TransactionType, string> = {
  gasto: "Gasto guardado",
  ingreso: "Ingreso guardado",
  transferencia: "Transferencia guardada",
};

const KEYS: { key: KeypadKey; label: string }[] = [
  ..."123456789".split("").map((digit) => ({ key: digit as KeypadKey, label: digit })),
  { key: ".", label: "Punto decimal" },
  { key: "0", label: "0" },
  { key: "borrar", label: "Borrar" },
];

type Photo = { kind: "igual" } | { kind: "nueva"; image: CompressedImage; url: string } | { kind: "quitar" };

type SheetProps = {
  request: SheetRequest;
  accounts: Account[];
  categories: Category[];
  templates: Template[];
  last: Transaction | null;
  savedRate: Settings["usdMxnRate"] | null;
  attachment: Attachment | null;
};

function TransactionSheet({ request, accounts, categories, templates, last, savedRate, attachment }: SheetProps) {
  const editing = request.kind === "editar" ? request.transaction : null;
  const preset: MovementPreset = editing ?? (request.kind === "nuevo" ? (request.preset ?? {}) : {});
  const today = todayInCancun();

  // Cuentas que se pueden elegir: las activas y las que ya usa el movimiento.
  const usable = accounts.filter(
    (account) => !account.archived || account.id === preset.accountId || account.id === preset.toAccountId,
  );
  const lastAccount = last && usable.some((account) => account.id === last.accountId) ? last.accountId : undefined;
  const initialAccount =
    preset.accountId ?? (request.kind === "nuevo" ? request.accountId : undefined) ?? lastAccount ?? usable[0]?.id ?? null;

  const otherAccount = (id: string | null) => usable.find((account) => account.id !== id)?.id ?? null;
  const currencyOf = (id: string | null): Currency => usable.find((account) => account.id === id)?.currency ?? "MXN";
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name;

  const [type, setType] = useState<TransactionType>(
    preset.type ?? (request.kind === "nuevo" ? request.type : undefined) ?? "gasto",
  );
  const [keypad, setKeypad] = useState(preset.amountCents ? centsToKeypad(preset.amountCents) : "");
  const [currency, setCurrency] = useState<Currency>(preset.currency ?? currencyOf(initialAccount));
  const [categoryId, setCategoryId] = useState<string | null>(preset.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(initialAccount);
  const [toAccountId, setToAccountId] = useState<string | null>(preset.toAccountId ?? otherAccount(initialAccount));
  const [date, setDate] = useState(preset.date ?? today);
  const [note, setNote] = useState(preset.note ?? "");
  const [tags, setTags] = useState(preset.tags?.join(", ") ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(preset.paymentMethod ?? null);
  const [rate, setRate] = useState(editing?.fxRate ?? savedRate?.rate ?? preset.fxRate ?? "");
  const [repeat, setRepeat] = useState<Frequency | null>(request.kind === "nuevo" ? (request.repeat ?? null) : null);
  const [repeatMode, setRepeatMode] = useState<RecurringMode>("automatico");
  const [asTemplate, setAsTemplate] = useState(request.kind === "nuevo" && Boolean(request.asTemplate));
  const [templateName, setTemplateName] = useState("");
  const [photo, setPhoto] = useState<Photo>({ kind: "igual" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(
    Boolean(
      (request.kind === "nuevo" && (request.repeat || request.asTemplate)) ||
        (editing && (editing.note || editing.tags.length > 0 || editing.paymentMethod || attachment)),
    ),
  );
  const [error, setError] = useState<{ field: DraftField | "plantilla"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const isTransfer = type === "transferencia";
  const amountCents = keypadToCents(keypad);
  const involved = isTransfer ? [currencyOf(accountId), currencyOf(toAccountId)] : [currencyOf(accountId)];
  const fxNeeded = needsFxRate(currency, involved);
  const pristine = keypad === "" && categoryId === null;
  const canRepeat = request.kind === "nuevo" && !request.recurring;

  // Vista previa de la foto guardada (como data URL: no hay que liberar nada).
  const existingUrl = useMemo(
    () => (attachment ? `data:${attachment.mimeType};base64,${bytesToBase64(attachment.data)}` : null),
    [attachment],
  );

  const previewUrl = photo.kind === "nueva" ? photo.url : photo.kind === "quitar" ? null : existingUrl;

  function press(key: KeypadKey) {
    setKeypad((value) => pressKey(value, key));
    setError(null);
  }

  function changeType(next: TransactionType) {
    setType(next);
    setError(null);
    if (categories.find((category) => category.id === categoryId)?.type !== next) setCategoryId(null);
    if (next === "transferencia") setCurrency(currencyOf(accountId));
  }

  function changeAccount(id: string) {
    setAccountId(id);
    setCurrency(currencyOf(id));
    if (toAccountId === id) setToAccountId(otherAccount(id));
    setError(null);
  }

  /** Llena la hoja con un movimiento o una plantilla; la fecha sigue siendo hoy. */
  function fill(values: MovementPreset) {
    if (values.type) setType(values.type);
    if (values.amountCents) setKeypad(centsToKeypad(values.amountCents));
    if (values.currency) setCurrency(values.currency);
    if (values.categoryId !== undefined) setCategoryId(values.categoryId);
    if (values.accountId && usable.some((account) => account.id === values.accountId)) setAccountId(values.accountId);
    if (values.toAccountId && usable.some((account) => account.id === values.toAccountId)) setToAccountId(values.toAccountId);
    if (values.paymentMethod !== undefined) setPaymentMethod(values.paymentMethod);
    if (values.note !== undefined) setNote(values.note);
    if (values.tags) setTags(values.tags.join(", "));
    if (values.fxRate && !savedRate) setRate(values.fxRate);
    setError(null);
  }

  /** De dónde viene el tipo de cambio escrito, para guardarlo con su fecha y su fuente. */
  function fxInput(): FxInput | null {
    const value = rate.trim();
    if (value === "") return null;
    if (editing?.fxRate === value && editing.fxDate) return { rate: value, date: editing.fxDate, source: editing.fxSource ?? "manual" };
    if (savedRate?.rate === value) return savedRate;
    return { rate: value, date: today, source: "manual" };
  }

  async function pickPhoto(file: File) {
    setPhotoBusy(true);
    try {
      const image = await compressImage(file);
      setPhoto({ kind: "nueva", image, url: `data:${image.mimeType};base64,${bytesToBase64(image.data)}` });
    } catch {
      setError({ field: "nota", message: "No se pudo leer la foto. Intenta con otra." });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    if (saving) return;
    const draft: TransactionDraft = {
      type,
      amountCents,
      currency,
      fx: fxInput(),
      categoryId,
      accountId,
      toAccountId,
      paymentMethod,
      date,
      note,
      tags,
    };
    const result = buildTransaction(draft, {
      accounts,
      categories,
      id: editing?.id ?? crypto.randomUUID(),
      now: Date.now(),
      existing: editing ?? undefined,
    });
    if (!result.ok) {
      setError({ field: result.field, message: result.error });
      if (result.field === "nota") setShowDetails(true);
      return;
    }
    const saved = result.transaction;
    const name = templateName.trim() || categoryName(saved.categoryId) || saved.note || TRANSACTION_TYPE_LABELS[saved.type];

    setSaving(true);
    const undo: (() => Promise<unknown>)[] = [];
    let budgetNote = "";
    try {
      const budgetBefore = await budgetSnapshot(saved, categories);
      await putTransaction(saved);
      if (editing) undo.push(() => putTransaction(editing));
      else
        undo.push(async () => {
          await removeTransaction(saved);
        });

      if (photo.kind !== "igual") {
        const next =
          photo.kind === "nueva"
            ? { id: crypto.randomUUID(), transactionId: saved.id, ...photo.image, createdAt: Date.now() }
            : null;
        await replaceAttachment(saved.id, next);
        const previous = attachment;
        undo.push(() => replaceAttachment(saved.id, previous));
      }

      if (canRepeat && repeat) {
        const ruleBase = { frequency: repeat, startDate: saved.date };
        // El esquema deja solo lo que se repite (sin id ni fechas).
        const template = movementTemplateSchema.parse(saved);
        const rule = {
          ...ruleBase,
          id: crypto.randomUUID(),
          nextDate: nextOccurrenceAfter(ruleBase, saved.date),
          mode: fxNeeded ? ("confirmar" as const) : repeatMode,
          active: true,
          template,
          createdAt: Date.now(),
        };
        await putRecurring(rule);
        undo.push(() => getDb().recurring.delete(rule.id));
        // Si la fecha ya pasó, registra lo que falte hasta hoy.
        await runRecurring();
      }

      if (request.kind === "nuevo" && request.recurring) {
        const { id, date: due } = request.recurring;
        const rule = await getDb().recurring.get(id);
        if (rule && rule.nextDate === due) {
          await getDb().recurring.update(id, { nextDate: nextOccurrenceAfter(rule, due) });
          undo.push(() => getDb().recurring.update(id, { nextDate: due }));
        }
      }

      if (asTemplate) {
        const template: Template = {
          id: crypto.randomUUID(),
          name: name.slice(0, 30),
          type: saved.type,
          amountCents: saved.amountCents,
          currency: saved.currency,
          categoryId: saved.categoryId,
          accountId: saved.accountId,
          toAccountId: saved.toAccountId,
          paymentMethod: saved.paymentMethod,
          note: saved.note,
          tags: saved.tags,
          order: nextOrder(templates),
          createdAt: Date.now(),
        };
        await putTemplate(template);
      }

      // Un tipo de cambio nuevo queda como el de referencia para lo que sigue.
      if (!editing && saved.fxRate && saved.fxSource === "manual" && saved.fxDate && saved.fxRate !== savedRate?.rate) {
        await setSetting("usdMxnRate", { rate: saved.fxRate, date: saved.fxDate, source: "manual" });
      }

      if (budgetBefore) {
        const after = await budgetSnapshot(saved, categories);
        const crossed = after ? thresholdCrossed(budgetBefore.spent, after.spent, budgetBefore.limit) : null;
        if (crossed && after) {
          const percent = Math.floor((after.spent / after.limit) * 100);
          budgetNote =
            crossed === 100
              ? ` Te pasaste del presupuesto de ${after.name} (${percent}%).`
              : ` Llevas el ${percent}% del presupuesto de ${after.name}.`;
        }
      }
    } catch {
      setSaving(false);
      setError({ field: "monto", message: "No se pudo guardar. Vuelve a intentar." });
      return;
    }

    closeTransactionSheet();
    const runUndo = async () => {
      for (const step of undo.reverse()) await step();
    };
    if (editing) {
      showToast({ message: `Cambios guardados.${budgetNote}`, action: { label: "Deshacer", run: runUndo } });
    } else {
      const category = categoryName(saved.categoryId);
      const amount = formatMoney(saved.amountCents, saved.currency);
      showToast({
        message: `${SAVED_LABEL[saved.type]}: ${amount}${category ? ` · ${category}` : ""}${budgetNote}`,
        action: { label: "Deshacer", run: runUndo },
      });
    }
  }

  async function remove() {
    if (!editing) return;
    setClosing(true);
    let restore: () => Promise<void>;
    try {
      restore = await removeTransaction(editing);
    } catch {
      setClosing(false);
      setError({ field: "monto", message: "No se pudo eliminar. Vuelve a intentar." });
      return;
    }
    closeTransactionSheet();
    showToast({ message: "Movimiento eliminado", action: { label: "Deshacer", run: restore } });
  }

  // Teclado físico: números, punto, borrar y Enter para guardar.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, select, textarea")) return;
      if (/^\d$/.test(event.key)) press(event.key as KeypadKey);
      else if (event.key === "." || event.key === ",") press(".");
      else if (event.key === "Backspace") press("borrar");
      else if (event.key === "Enter" && !target?.closest("button")) void save();
      else return;
      event.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const preview = fxNeeded && isValidRate(rate.trim()) && amountCents > 0 ? fxPreview() : null;
  function fxPreview(): string | null {
    const target: Currency | undefined = currency === "USD" ? "MXN" : involved.find((item) => item !== currency);
    if (!target) return null;
    return `≈ ${formatMoney(convertCents(amountCents, currency, target, rate.trim()), target)}`;
  }

  const fxHint =
    savedRate && rate.trim() === savedRate.rate
      ? `El último que escribiste, del ${formatDate(savedRate.date)}.`
      : editing?.fxRate && rate.trim() === editing.fxRate && editing.fxDate
        ? `Del ${formatDate(editing.fxDate)}.`
        : "Cuántos pesos vale 1 dólar. Se guarda con la fecha de hoy.";

  const saveLabel = editing ? "Guardar cambios" : `Guardar ${TRANSACTION_TYPE_LABELS[type].toLowerCase()}`;
  const title = editing ? "Editar movimiento" : request.kind === "nuevo" && request.recurring ? "Confirmar recurrente" : "Registrar";

  return (
    <Sheet
      title={title}
      onClose={closeTransactionSheet}
      actions={
        editing ? (
          <Button variant="fantasma" size="icono" aria-label="Eliminar movimiento" disabled={closing} onClick={remove}>
            <Trash2 aria-hidden className="size-5 text-negativo-texto" />
          </Button>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error.message}</FormMessage> : null}
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Teclado del monto">
            {KEYS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={() => press(key)}
                className="cifras grid h-11 place-items-center rounded-control bg-superficie text-titulo font-medium transition-colors duration-120 ease-boveda hover:bg-borde active:bg-borde"
              >
                {key === "borrar" ? <Delete aria-hidden className="size-6" strokeWidth={1.75} /> : key}
              </button>
            ))}
          </div>
          <Button size="lg" className="w-full" disabled={saving} onClick={() => void save()}>
            {saveLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Tipo de movimiento" className="grid grid-cols-3 gap-1 rounded-full bg-fondo p-1">
          {TRANSACTION_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => changeType(option)}
              className={cn(
                "h-11 rounded-full text-etiqueta font-medium transition-colors duration-120 ease-boveda",
                type === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
              )}
            >
              {TRANSACTION_TYPE_LABELS[option]}
            </button>
          ))}
        </div>

        {request.kind === "nuevo" && !request.recurring && pristine ? (
          <QuickChips
            last={last}
            templates={templates}
            categoryName={categoryName}
            onRepeat={() => last && fill(last)}
            onTemplate={(template) =>
              fill({ ...template, amountCents: template.amountCents ?? undefined, accountId: template.accountId ?? undefined })
            }
          />
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0">
            <span className="sr-only">Monto: </span>
            <output
              aria-live="polite"
              className={cn(
                "cifras block truncate font-serif text-hero font-semibold",
                keypad === "" && "text-texto-2",
                error?.field === "monto" && "text-negativo-texto",
              )}
            >
              {formatKeypad(keypad, currency)}
            </output>
          </p>
          {!isTransfer ? (
            <div role="group" aria-label="Moneda" className="flex shrink-0 rounded-full bg-fondo p-1">
              {(["MXN", "USD"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={currency === option}
                  onClick={() => {
                    setCurrency(option);
                    setError(null);
                  }}
                  className={cn(
                    "h-11 rounded-full px-3 text-etiqueta font-medium transition-colors duration-120 ease-boveda",
                    currency === option ? "bg-elevada text-texto" : "text-texto-2 hover:text-texto",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {fxNeeded ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo-cambio">Tipo de cambio (pesos por 1 dólar)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="tipo-cambio"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ej. 18.50"
                value={rate}
                aria-invalid={error?.field === "tipoCambio" || undefined}
                aria-describedby="tipo-cambio-ayuda"
                onChange={(event) => {
                  setRate(event.target.value.replace(",", "."));
                  setError(null);
                }}
                className="max-w-36"
              />
              {preview ? <span className="cifras text-interfaz text-texto-2">{preview}</span> : null}
            </div>
            <p id="tipo-cambio-ayuda" className="text-nota text-texto-2">
              {fxHint}
            </p>
          </div>
        ) : null}

        {isTransfer ? (
          <TransferAccounts
            accounts={usable}
            from={accountId}
            to={toAccountId}
            onFrom={changeAccount}
            onTo={(id) => {
              setToAccountId(id);
              setError(null);
            }}
          />
        ) : (
          <CategoryPicker
            categories={categories}
            type={type === "ingreso" ? "ingreso" : "gasto"}
            value={categoryId}
            invalid={error?.field === "categoria"}
            onChange={(id) => {
              setCategoryId(id);
              setError(null);
            }}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!isTransfer ? (
            <Select
              aria-label="Cuenta"
              value={accountId ?? ""}
              onChange={(event) => changeAccount(event.target.value)}
              className="min-w-0 flex-1 basis-40"
            >
              {usable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            type="date"
            aria-label="Fecha"
            value={date}
            required
            onChange={(event) => {
              setDate(event.target.value);
              setError(null);
            }}
            className="w-auto min-w-0 flex-1 basis-36"
          />
          <Button
            variant="fantasma"
            aria-expanded={showDetails}
            aria-controls="mas-detalles"
            onClick={() => setShowDetails((value) => !value)}
          >
            Más detalles
            <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-120", showDetails && "rotate-180")} />
          </Button>
        </div>

        {showDetails ? (
          <div id="mas-detalles" className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nota">Nota</Label>
              <Input
                id="nota"
                value={note}
                maxLength={280}
                autoComplete="off"
                placeholder="Ej. comida con clientes"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            {!isTransfer ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-etiqueta font-medium text-texto-2" id="metodo-titulo">
                  Método de pago
                </span>
                <div role="group" aria-labelledby="metodo-titulo" className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <Chip
                      key={method}
                      pressed={paymentMethod === method}
                      onClick={() => setPaymentMethod((value) => (value === method ? null : method))}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="etiquetas">Etiquetas</Label>
              <Input
                id="etiquetas"
                value={tags}
                autoComplete="off"
                placeholder="Ej. viaje, trabajo"
                aria-describedby="etiquetas-ayuda"
                onChange={(event) => setTags(event.target.value)}
              />
              <p id="etiquetas-ayuda" className="text-nota text-texto-2">
                Sepáralas con comas.
              </p>
            </div>

            {canRepeat ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repetir">Repetir</Label>
                <Select
                  id="repetir"
                  value={repeat ?? ""}
                  onChange={(event) => setRepeat((event.target.value || null) as Frequency | null)}
                >
                  <option value="">No se repite</option>
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency]}
                    </option>
                  ))}
                </Select>
                {repeat ? (
                  fxNeeded ? (
                    <p className="text-nota text-texto-2">
                      Con dólares siempre te pedirá confirmación, para que revises el tipo de cambio.
                    </p>
                  ) : (
                    <Select
                      aria-label="Cómo registrarlo"
                      value={repeatMode}
                      onChange={(event) => setRepeatMode(event.target.value as RecurringMode)}
                    >
                      {RECURRING_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {RECURRING_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </Select>
                  )
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-3 text-interfaz">
                <input
                  type="checkbox"
                  checked={asTemplate}
                  onChange={(event) => setAsTemplate(event.target.checked)}
                  className="size-5 accent-laton"
                />
                Guardar también como plantilla
              </label>
              {asTemplate ? (
                <Input
                  aria-label="Nombre de la plantilla"
                  value={templateName}
                  maxLength={30}
                  autoComplete="off"
                  placeholder={`Ej. ${categoryName(categoryId) ?? "Café"}`}
                  onChange={(event) => setTemplateName(event.target.value)}
                />
              ) : null}
            </div>

            <PhotoField
              previewUrl={previewUrl}
              busy={photoBusy}
              onPick={(file) => void pickPhoto(file)}
              onRemove={() => setPhoto({ kind: "quitar" })}
            />
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Gasto del mes en la categoría madre del movimiento, si tiene presupuesto. */
async function budgetSnapshot(
  transaction: Transaction,
  categories: Category[],
): Promise<{ spent: number; limit: number; name: string } | null> {
  if (transaction.type !== "gasto" || transaction.categoryId === null) return null;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const root = rootCategoryId(transaction.categoryId, byId);
  const db = getDb();
  const budget = await db.budgets.get(root);
  if (!budget) return null;
  const range = monthRange(transaction.date);
  const month = await db.transactions.where("date").between(range.start, range.end, true, true).toArray();
  const spent = spendingByRootCategory(month, categories, range).get(root) ?? 0;
  return { spent, limit: budget.amountCents, name: byId.get(root)?.name ?? "la categoría" };
}
