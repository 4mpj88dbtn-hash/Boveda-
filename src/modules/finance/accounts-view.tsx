"use client";

import { ArrowRightLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatDate, todayInCancun } from "@/lib/dates";
import { CURRENCIES, formatMoney, parseAmountToCents, type Currency } from "@/lib/money";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { nextOrder, putAccount, useAccounts, useTransactions } from "./data";
import { AccountIcon } from "./icons";
import { NetWorthChart } from "./net-worth-chart";
import { accountBalances, netWorth } from "./lib/balances";
import { centsToKeypad } from "./lib/keypad";
import { isValidRate } from "./lib/transactions";
import { openTransactionSheet } from "./sheet-store";
import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS, isLiability, type Account, type AccountKind } from "./types";

type Editing = { kind: "nueva" } | { kind: "editar"; account: Account; balance: number };

/** Cuentas con su saldo, patrimonio neto y tipo de cambio de referencia. */
export function AccountsView() {
  const accounts = useAccounts();
  const transactions = useTransactions();
  const usdRate = useSetting("usdMxnRate");
  const [editing, setEditing] = useState<Editing | null>(null);

  if (!accounts || !transactions || !usdRate) return null;

  const balances = accountBalances(accounts, transactions);
  const worth = netWorth(accounts, balances, usdRate.value?.rate ?? null);
  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);
  const open = (account: Account) =>
    setEditing({ kind: "editar", account, balance: balances.get(account.id) ?? account.openingBalanceCents });

  return (
    <>
      <Panel aria-labelledby="patrimonio-cuentas">
        <div className="flex flex-col gap-1">
          <h2 id="patrimonio-cuentas" className="font-sans text-etiqueta font-medium text-texto-2">
            Patrimonio neto
          </h2>
          <p className="font-serif text-display font-semibold lg:text-display-lg">
            <Amount cents={worth.totalCents} />
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-etiqueta text-texto-2">Lo que tienes</dt>
            <dd className="font-serif text-cifra font-semibold">
              <Amount cents={worth.assetsCents} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-etiqueta text-texto-2">Lo que debes</dt>
            <dd className="font-serif text-cifra font-semibold">
              <Amount cents={worth.liabilitiesCents} />
            </dd>
          </div>
        </dl>
        {worth.missingRate ? (
          <p className="text-etiqueta text-negativo-texto">
            No incluye tus cuentas en dólares: escribe abajo el tipo de cambio.
          </p>
        ) : null}
      </Panel>

      <NetWorthChart accounts={accounts} transactions={transactions} usdRate={usdRate.value?.rate ?? null} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({ kind: "nueva" })}>
          <Plus aria-hidden className="size-5" />
          Agregar cuenta
        </Button>
        <Button
          variant="secundario"
          disabled={active.length < 2}
          onClick={() => openTransactionSheet({ kind: "nuevo", type: "transferencia" })}
        >
          <ArrowRightLeft aria-hidden className="size-5" />
          Transferir
        </Button>
      </div>

      {active.length === 0 ? (
        <EmptyState title="Sin cuentas activas" description="Agrega tu efectivo, tus bancos y tus tarjetas." />
      ) : (
        <AccountList accounts={active} balances={balances} onOpen={open} />
      )}

      {archived.length > 0 ? (
        <details className="group flex flex-col gap-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-interfaz text-texto-2 hover:text-texto">
            Archivadas ({archived.length})
          </summary>
          <p className="mb-2 text-etiqueta text-texto-2">
            Siguen contando en tu patrimonio. Para sacarlas, deja su saldo en cero.
          </p>
          <AccountList accounts={archived} balances={balances} onOpen={open} />
        </details>
      ) : null}

      <RatePanel key={usdRate.value?.rate ?? "sin-tipo"} rate={usdRate.value ?? null} />

      {editing ? (
        <AccountSheet
          editing={editing}
          order={nextOrder(accounts)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function AccountList({
  accounts,
  balances,
  onOpen,
}: {
  accounts: Account[];
  balances: Map<string, number>;
  onOpen: (account: Account) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-borde rounded-tarjeta border border-borde bg-superficie">
      {accounts.map((account) => {
        const balance = balances.get(account.id) ?? account.openingBalanceCents;
        const owes = isLiability(account.kind) && balance < 0;
        return (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => onOpen(account)}
              className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-120 ease-boveda hover:bg-elevada"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-elevada text-texto-2">
                <AccountIcon kind={account.kind} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-interfaz">{account.name}</span>
                <span className="truncate text-etiqueta text-texto-2">
                  {ACCOUNT_KIND_LABELS[account.kind]} · {account.currency}
                </span>
              </span>
              <span className="flex flex-col items-end">
                {owes ? <span className="text-nota text-texto-2">Debes</span> : null}
                <Amount
                  cents={owes ? -balance : balance}
                  currency={account.currency}
                  className={cn("text-interfaz", balance < 0 && !owes && "text-negativo-texto")}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AccountSheet({ editing, order, onClose }: { editing: Editing; order: number; onClose: () => void }) {
  const current = editing.kind === "editar" ? editing.account : null;
  const currentBalance = editing.kind === "editar" ? editing.balance : 0;
  const [name, setName] = useState(current?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(current?.kind ?? "banco");
  const [currency, setCurrency] = useState<Currency>(current?.currency ?? "MXN");
  const [balanceText, setBalanceText] = useState(current ? centsToKeypad(Math.abs(currentBalance)) : "");
  const [balanceTouched, setBalanceTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liability = isLiability(kind);

  async function save(archived = current?.archived ?? false) {
    const trimmed = name.trim();
    if (trimmed === "") return setError("Escribe el nombre de la cuenta.");
    let openingBalanceCents = current?.openingBalanceCents ?? 0;
    if (balanceTouched || !current) {
      const parsed = parseAmountToCents(balanceText === "" ? "0" : balanceText);
      if (!parsed.ok) return setError(parsed.error);
      const wanted = liability ? -parsed.cents : parsed.cents;
      // El saldo de hoy es el inicial más los movimientos; se ajusta el inicial.
      openingBalanceCents = wanted - (currentBalance - (current?.openingBalanceCents ?? 0));
    }
    const account: Account = {
      id: current?.id ?? crypto.randomUUID(),
      name: trimmed.slice(0, 40),
      kind,
      currency: current?.currency ?? currency,
      openingBalanceCents,
      archived,
      order: current?.order ?? order,
      createdAt: current?.createdAt ?? Date.now(),
    };
    try {
      await putAccount(account);
    } catch {
      return setError("No se pudo guardar. Vuelve a intentar.");
    }
    onClose();
    showToast({
      message: current
        ? archived !== current.archived
          ? archived
            ? `${account.name} archivada`
            : `${account.name} activa otra vez`
          : "Cuenta guardada"
        : `Cuenta ${account.name} agregada`,
    });
  }

  return (
    <Sheet
      title={current ? "Editar cuenta" : "Agregar cuenta"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar cuenta
          </Button>
          {current ? (
            <Button variant="fantasma" className="w-full" onClick={() => void save(!current.archived)}>
              {current.archived ? "Volver a activar" : "Archivar cuenta"}
            </Button>
          ) : null}
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
        <Field id="cuenta-nombre" label="Nombre">
          <Input
            id="cuenta-nombre"
            value={name}
            maxLength={40}
            autoComplete="off"
            placeholder="Ej. BBVA nómina"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field id="cuenta-tipo" label="Tipo">
          <Select id="cuenta-tipo" value={kind} onChange={(event) => setKind(event.target.value as AccountKind)}>
            {ACCOUNT_KINDS.map((option) => (
              <option key={option} value={option}>
                {ACCOUNT_KIND_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="cuenta-moneda"
          label="Moneda"
          hint={current ? "La moneda no se cambia después de crear la cuenta." : undefined}
        >
          <Select
            id="cuenta-moneda"
            value={current?.currency ?? currency}
            disabled={Boolean(current)}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {CURRENCIES.map((option) => (
              <option key={option} value={option}>
                {option === "MXN" ? "Pesos (MXN)" : "Dólares (USD)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="cuenta-saldo"
          label={liability ? "Lo que debes hoy" : "Saldo de hoy"}
          hint={
            current
              ? `Hoy: ${formatMoney(currentBalance, current.currency)}. Si lo cambias, se ajusta el saldo inicial; tus movimientos no cambian.`
              : "Lo que hay hoy en la cuenta. Después se mueve con tus gastos, ingresos y transferencias."
          }
        >
          <Input
            id="cuenta-saldo"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={balanceText}
            aria-describedby="cuenta-saldo-ayuda"
            onChange={(event) => {
              setBalanceText(event.target.value);
              setBalanceTouched(true);
              setError(null);
            }}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

/** Tipo de cambio de referencia: lo escribes tú hasta que llegue el dato de mercado (Fase 2). */
function RatePanel({ rate }: { rate: { rate: string; date: string; source: string } | null }) {
  const [value, setValue] = useState(rate?.rate ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleaned = value.trim().replace(",", ".");
    if (!isValidRate(cleaned)) return setError("Escribe cuántos pesos vale 1 dólar, por ejemplo 18.50.");
    await setSetting("usdMxnRate", { rate: cleaned, date: todayInCancun(), source: "manual" });
    setError(null);
    showToast({ message: "Tipo de cambio guardado" });
  }

  return (
    <Panel title="Dólar">
      <p className="text-etiqueta text-texto-2">
        {rate
          ? `Usas $${rate.rate} por dólar, escrito por ti el ${formatDate(rate.date)}.`
          : "Aún no escribes un tipo de cambio."}{" "}
        Sirve para sumar tus cuentas en dólares y como sugerencia al registrar. Desde la Fase 2 llegará el dato del
        mercado con su fuente y su hora.
      </p>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field id="tipo-cambio-referencia" label="Pesos por 1 dólar">
          <Input
            id="tipo-cambio-referencia"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej. 18.50"
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            className="max-w-40"
          />
        </Field>
        <Button type="submit" variant="secundario">
          Guardar
        </Button>
      </form>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </Panel>
  );
}
