"use client";

import { ArrowRightLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatDayHeading, formatMonth, monthRange, shiftMonth, todayInCancun } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAccounts, useCategories, useTransactions } from "./data";
import { CategoryIcon } from "./icons";
import { centsToKeypad } from "./lib/keypad";
import { inRange, percentChange, periodTotals } from "./lib/summary";
import { MonthTotals } from "./overview";
import { openTransactionSheet } from "./sheet-store";
import type { Account, Category, Transaction, TransactionType } from "./types";

const TYPE_FILTERS: { value: TransactionType | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "gasto", label: "Gastos" },
  { value: "ingreso", label: "Ingresos" },
  { value: "transferencia", label: "Transferencias" },
];

/** Sin acentos ni mayúsculas, para buscar "cafe" y encontrar "Café". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Historial del mes con búsqueda y filtros. Tocar un movimiento lo abre para editarlo. */
export function MovementsView() {
  const transactions = useTransactions();
  const categories = useCategories();
  const accounts = useAccounts();
  const today = todayInCancun();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | "todos">("todos");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  if (!transactions || !categories || !accounts) return null;

  const range = monthRange(`${month}-01`);
  const totals = periodTotals(transactions, range);
  const previousMonth = shiftMonth(month, -1);
  const previous = periodTotals(transactions, monthRange(`${previousMonth}-01`));
  const expenseChange = percentChange(totals.expenseCents, previous.expenseCents);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const needle = normalize(query.trim());
  const filtered = transactions.filter((transaction) => {
    if (!inRange(transaction.date, range)) return false;
    if (type !== "todos" && transaction.type !== type) return false;
    if (categoryId && transaction.categoryId !== categoryId) return false;
    if (accountId && transaction.accountId !== accountId && transaction.toAccountId !== accountId) return false;
    if (needle === "") return true;
    return normalize(searchText(transaction, categoryById, accountById)).includes(needle);
  });

  const days = new Map<string, Transaction[]>();
  for (const transaction of filtered) {
    const list = days.get(transaction.date) ?? [];
    list.push(transaction);
    days.set(transaction.date, list);
  }

  const hasFilters = needle !== "" || type !== "todos" || categoryId !== "" || accountId !== "";
  const clearFilters = () => {
    setQuery("");
    setType("todos");
    setCategoryId("");
    setAccountId("");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button variant="fantasma" size="icono" aria-label="Mes anterior" onClick={() => setMonth(previousMonth)}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <h2 className="text-titulo first-letter:uppercase lg:text-titulo-lg" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <Button
          variant="fantasma"
          size="icono"
          aria-label="Mes siguiente"
          disabled={month >= today.slice(0, 7)}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight aria-hidden className="size-5" />
        </Button>
      </div>

      <Panel>
        <MonthTotals totals={totals} />
        {expenseChange !== null ? (
          <p className="text-etiqueta text-texto-2">
            Gastos frente a {formatMonth(previousMonth)}:{" "}
            <span className="cifras text-texto">{formatPercent(expenseChange, 1)}</span>
          </p>
        ) : null}
      </Panel>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-2" />
          <Input
            type="search"
            aria-label="Buscar movimientos"
            placeholder="Buscar nota, categoría o monto"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div role="group" aria-label="Tipo" className="-mx-1 flex gap-1 overflow-x-auto">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={type === filter.value}
              onClick={() => setType(filter.value)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-etiqueta font-medium transition-colors duration-120 ease-boveda",
                type === filter.value ? "border-laton text-texto" : "border-borde text-texto-2 hover:text-texto",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Cuenta" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Cuentas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        transactions.length === 0 ? (
          <EmptyState
            title="Aún no hay movimientos"
            description="Registra tu primer gasto: escribe el monto, elige la categoría y guarda."
            action={
              <Button className="mt-2" onClick={() => openTransactionSheet({ kind: "nuevo" })}>
                Registrar gasto
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={hasFilters ? "Nada coincide con tu búsqueda" : `Sin movimientos en ${formatMonth(month)}`}
            description={
              hasFilters ? "Cambia la búsqueda o quita los filtros." : "Cambia de mes o registra uno con el botón +."
            }
            action={
              hasFilters ? (
                <Button variant="secundario" className="mt-2" onClick={clearFilters}>
                  Quitar filtros
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-5">
          {[...days].map(([date, list]) => (
            <section key={date} aria-label={formatDayHeading(date, today)} className="flex flex-col gap-1">
              <h3 className="font-sans text-etiqueta font-medium text-texto-2 first-letter:uppercase">
                {formatDayHeading(date, today)}
              </h3>
              <ul className="flex flex-col divide-y divide-borde rounded-tarjeta border border-borde bg-superficie">
                {list.map((transaction) => (
                  <MovementRow
                    key={transaction.id}
                    transaction={transaction}
                    category={transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined}
                    account={accountById.get(transaction.accountId)}
                    toAccount={transaction.toAccountId ? accountById.get(transaction.toAccountId) : undefined}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function searchText(
  transaction: Transaction,
  categories: Map<string, Category>,
  accounts: Map<string, Account>,
): string {
  return [
    transaction.categoryId ? categories.get(transaction.categoryId)?.name : "transferencia",
    accounts.get(transaction.accountId)?.name,
    transaction.toAccountId ? accounts.get(transaction.toAccountId)?.name : "",
    transaction.note,
    transaction.tags.join(" "),
    formatMoney(transaction.amountCents, transaction.currency),
    centsToKeypad(transaction.amountCents),
  ].join(" ");
}

function MovementRow({
  transaction,
  category,
  account,
  toAccount,
}: {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  toAccount?: Account;
}) {
  const isTransfer = transaction.type === "transferencia";
  const title = isTransfer ? "Transferencia" : (category?.name ?? "Sin categoría");
  const where = isTransfer ? `${account?.name ?? "?"} → ${toAccount?.name ?? "?"}` : (account?.name ?? "");
  const detail = [where, transaction.note].filter(Boolean).join(" · ");
  const cents = transaction.type === "gasto" ? -transaction.amountCents : transaction.amountCents;

  return (
    <li>
      <button
        type="button"
        onClick={() => openTransactionSheet({ kind: "editar", transaction })}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-120 ease-boveda hover:bg-elevada"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-elevada text-texto-2">
          {isTransfer ? (
            <ArrowRightLeft aria-hidden className="size-5" strokeWidth={1.75} />
          ) : (
            <CategoryIcon name={category?.icon ?? "ellipsis"} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-interfaz">{title}</span>
          {detail ? <span className="truncate text-etiqueta text-texto-2">{detail}</span> : null}
        </span>
        <Amount
          cents={cents}
          currency={transaction.currency}
          tone={transaction.type === "ingreso" ? "variacion" : isTransfer ? "apagado" : "neutro"}
          className="text-interfaz"
        />
      </button>
    </li>
  );
}
