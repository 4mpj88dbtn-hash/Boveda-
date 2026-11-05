"use client";

import { ChevronDown, Delete, Repeat2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Label, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatDate, todayInCancun } from "@/lib/dates";
import { convertCents, formatMoney, type Currency } from "@/lib/money";
import { setSetting, useSetting, type Settings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { deleteTransaction, putTransaction, useAccounts, useCategories, useLastTransaction } from "./data";
import { CategoryIcon } from "./icons";
import { centsToKeypad, formatKeypad, keypadToCents, pressKey, type KeypadKey } from "./lib/keypad";
import {
  buildTransaction,
  isValidRate,
  needsFxRate,
  type DraftField,
  type FxInput,
  type TransactionDraft,
} from "./lib/transactions";
import { closeTransactionSheet, useTransactionSheet, type SheetRequest } from "./sheet-store";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  type Account,
  type Category,
  type PaymentMethod,
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
  const last = useLastTransaction();
  const savedRate = useSetting("usdMxnRate");
  if (!accounts || !categories || last === undefined || !savedRate) return null;
  return (
    <TransactionSheet
      request={request}
      accounts={accounts}
      categories={categories}
      last={last}
      savedRate={savedRate.value ?? null}
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

type SheetProps = {
  request: SheetRequest;
  accounts: Account[];
  categories: Category[];
  last: Transaction | null;
  savedRate: Settings["usdMxnRate"] | null;
};

function TransactionSheet({ request, accounts, categories, last, savedRate }: SheetProps) {
  const editing = request.kind === "editar" ? request.transaction : null;
  const today = todayInCancun();

  // Cuentas que se pueden elegir: las activas y las que ya usa el movimiento.
  const usable = accounts.filter(
    (account) => !account.archived || account.id === editing?.accountId || account.id === editing?.toAccountId,
  );
  const lastAccount = last && usable.some((account) => account.id === last.accountId) ? last.accountId : undefined;
  const initialAccount =
    editing?.accountId ?? (request.kind === "nuevo" ? request.accountId : undefined) ?? lastAccount ?? usable[0]?.id ?? null;

  const otherAccount = (id: string | null) => usable.find((account) => account.id !== id)?.id ?? null;
  const currencyOf = (id: string | null): Currency => usable.find((account) => account.id === id)?.currency ?? "MXN";

  const [type, setType] = useState<TransactionType>(
    editing?.type ?? (request.kind === "nuevo" ? request.type : undefined) ?? "gasto",
  );
  const [keypad, setKeypad] = useState(editing ? centsToKeypad(editing.amountCents) : "");
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? currencyOf(initialAccount));
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(initialAccount);
  const [toAccountId, setToAccountId] = useState<string | null>(editing?.toAccountId ?? otherAccount(initialAccount));
  const [date, setDate] = useState(editing?.date ?? today);
  const [note, setNote] = useState(editing?.note ?? "");
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(editing?.paymentMethod ?? null);
  const [rate, setRate] = useState(editing?.fxRate ?? savedRate?.rate ?? "");
  const [showDetails, setShowDetails] = useState(
    Boolean(editing && (editing.note || editing.tags.length > 0 || editing.paymentMethod)),
  );
  const [error, setError] = useState<{ field: DraftField; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const isTransfer = type === "transferencia";
  const amountCents = keypadToCents(keypad);
  const involved = isTransfer ? [currencyOf(accountId), currencyOf(toAccountId)] : [currencyOf(accountId)];
  const fxNeeded = needsFxRate(currency, involved);
  const pristine = keypad === "" && categoryId === null;

  const visibleCategories = categories.filter(
    (category) =>
      category.type === type && category.parentId === null && (!category.archived || category.id === categoryId),
  );

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

  function repeatLast() {
    if (!last) return;
    setType(last.type);
    setKeypad(centsToKeypad(last.amountCents));
    setCurrency(last.currency);
    setCategoryId(last.categoryId);
    if (usable.some((account) => account.id === last.accountId)) setAccountId(last.accountId);
    if (last.toAccountId && usable.some((account) => account.id === last.toAccountId)) setToAccountId(last.toAccountId);
    setPaymentMethod(last.paymentMethod);
    setNote(last.note);
    setTags(last.tags.join(", "));
    if (last.fxRate && !savedRate) setRate(last.fxRate);
  }

  /** De dónde viene el tipo de cambio escrito, para guardarlo con su fecha y su fuente. */
  function fxInput(): FxInput | null {
    const value = rate.trim();
    if (value === "") return null;
    if (editing?.fxRate === value && editing.fxDate) return { rate: value, date: editing.fxDate, source: editing.fxSource ?? "manual" };
    if (savedRate?.rate === value) return savedRate;
    return { rate: value, date: today, source: "manual" };
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
    setSaving(true);
    try {
      await putTransaction(saved);
      // Un tipo de cambio nuevo queda como el de referencia para lo que sigue.
      if (!editing && saved.fxRate && saved.fxSource === "manual" && saved.fxDate && saved.fxRate !== savedRate?.rate) {
        await setSetting("usdMxnRate", { rate: saved.fxRate, date: saved.fxDate, source: "manual" });
      }
    } catch {
      setSaving(false);
      setError({ field: "monto", message: "No se pudo guardar. Vuelve a intentar." });
      return;
    }
    closeTransactionSheet();
    if (editing) {
      showToast({ message: "Cambios guardados", action: { label: "Deshacer", run: () => putTransaction(editing) } });
    } else {
      const category = categories.find((item) => item.id === saved.categoryId);
      const amount = formatMoney(saved.amountCents, saved.currency);
      showToast({
        message: `${SAVED_LABEL[saved.type]}: ${amount}${category ? ` · ${category.name}` : ""}`,
        action: { label: "Deshacer", run: () => deleteTransaction(saved.id) },
      });
    }
  }

  async function remove() {
    if (!editing) return;
    setClosing(true);
    try {
      await deleteTransaction(editing.id);
    } catch {
      setClosing(false);
      setError({ field: "monto", message: "No se pudo eliminar. Vuelve a intentar." });
      return;
    }
    closeTransactionSheet();
    showToast({ message: "Movimiento eliminado", action: { label: "Deshacer", run: () => putTransaction(editing) } });
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

  return (
    <Sheet
      title={editing ? "Editar movimiento" : "Registrar"}
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
                {key === "borrar" ? <Delete aria-hidden className="size-6" strokeWidth={1.75} /> : key === "." ? "." : key}
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

        {!editing && last && pristine ? (
          <button
            type="button"
            onClick={repeatLast}
            className="flex min-h-11 items-center gap-2 self-start rounded-full border border-borde-control px-3 text-etiqueta text-texto-2 transition-colors duration-120 ease-boveda hover:text-texto"
          >
            <Repeat2 aria-hidden className="size-4" />
            Repetir último:{" "}
            <span className="cifras text-texto">{formatMoney(last.amountCents, last.currency)}</span>
            {categories.find((category) => category.id === last.categoryId)?.name ?? TRANSACTION_TYPE_LABELS[last.type]}
          </button>
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
          <div role="group" aria-label="Categoría" className="grid grid-cols-4 gap-1.5">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => {
                  setCategoryId(category.id);
                  setError(null);
                }}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-control border px-1 py-1.5 text-center text-nota leading-tight transition-colors duration-120 ease-boveda",
                  categoryId === category.id
                    ? "border-laton bg-superficie text-texto"
                    : "border-borde text-texto-2 hover:text-texto",
                  error?.field === "categoria" && categoryId === null && "border-negativo",
                )}
              >
                <CategoryIcon name={category.icon} className={categoryId === category.id ? "text-laton" : undefined} />
                <span className="line-clamp-2 break-words">{category.name}</span>
              </button>
            ))}
          </div>
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
          <div id="mas-detalles" className="flex flex-col gap-4">
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
                    <button
                      key={method}
                      type="button"
                      aria-pressed={paymentMethod === method}
                      onClick={() => setPaymentMethod((value) => (value === method ? null : method))}
                      className={cn(
                        "h-11 rounded-full border px-3 text-etiqueta transition-colors duration-120 ease-boveda",
                        paymentMethod === method ? "border-laton text-texto" : "border-borde-control text-texto-2",
                      )}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
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
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function TransferAccounts({
  accounts,
  from,
  to,
  onFrom,
  onTo,
}: {
  accounts: Account[];
  from: string | null;
  to: string | null;
  onFrom: (id: string) => void;
  onTo: (id: string) => void;
}) {
  if (accounts.length < 2) {
    return (
      <p className="text-interfaz text-texto-2">
        Para transferir necesitas dos cuentas. Agrega otra en Finanzas → Cuentas.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cuenta-origen">Sale de</Label>
        <Select id="cuenta-origen" value={from ?? ""} onChange={(event) => onFrom(event.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cuenta-destino">Entra a</Label>
        <Select id="cuenta-destino" value={to ?? ""} onChange={(event) => onTo(event.target.value)}>
          {accounts
            .filter((account) => account.id !== from)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}
