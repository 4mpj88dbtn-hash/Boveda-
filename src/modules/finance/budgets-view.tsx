"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatMonth, monthRange, shiftMonth, todayInCancun } from "@/lib/dates";
import { formatMoney, formatPercent, parseAmountToCents } from "@/lib/money";
import { setSetting, useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { deleteBudget, putBudget, useBudgets, useCategories, useTransactions } from "./data";
import { CategoryIcon } from "./icons";
import { centsToKeypad } from "./lib/keypad";
import {
  applyBudgetRule,
  averageMonthlyIncome,
  budgetStatuses,
  DEFAULT_BUDGET_RULE,
  type BudgetLevel,
  type BudgetRule,
  type RuleLine,
} from "./lib/budgets";
import type { Budget, Category } from "./types";

const BAR: Record<BudgetLevel, string> = { ok: "bg-positivo", alerta: "bg-laton", excedido: "bg-negativo" };

function ProgressBar({ ratio, level }: { ratio: number; level: BudgetLevel }) {
  return (
    <div className="h-2 rounded-full bg-elevada" aria-hidden>
      <div className={cn("h-full rounded-full", BAR[level])} style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }} />
    </div>
  );
}

type Editing = { kind: "nuevo" } | { kind: "editar"; budget: Budget };

/** Presupuestos mensuales por categoría (avisos al 80% y 100%) y la plantilla 50/30/20. */
export function BudgetsView() {
  const budgets = useBudgets();
  const categories = useCategories();
  const transactions = useTransactions();
  const rule = useSetting("budgetRule");
  const today = todayInCancun();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editingRule, setEditingRule] = useState(false);

  if (!budgets || !categories || !transactions || !rule) return null;

  const range = monthRange(`${month}-01`);
  const statuses = budgetStatuses(budgets, transactions, categories, range).sort((a, b) => b.ratio - a.ratio);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const currentRule = rule.value ?? DEFAULT_BUDGET_RULE;
  const average = averageMonthlyIncome(transactions, `${month}-15`);
  const baseIncome = currentRule.incomeCents ?? average?.cents ?? null;
  const breakdown = baseIncome ? applyBudgetRule(currentRule, baseIncome, transactions, categories, range) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button variant="fantasma" size="icono" aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
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

      <Panel
        title="Por categoría"
        action={
          <Button variant="fantasma" onClick={() => setEditing({ kind: "nuevo" })}>
            <Plus aria-hidden className="size-5" />
            Agregar
          </Button>
        }
      >
        {statuses.length === 0 ? (
          <EmptyState
            title="Sin presupuestos"
            description="Ponle un límite mensual a las categorías que quieres cuidar. Te avisamos al llegar al 80% y al 100%."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {statuses.map((status) => {
              const category = byId.get(status.categoryId);
              const budget = budgets.find((item) => item.categoryId === status.categoryId);
              return (
                <li key={status.categoryId}>
                  <button
                    type="button"
                    onClick={() => budget && setEditing({ kind: "editar", budget })}
                    className="flex w-full flex-col gap-2 rounded-control px-2 py-2.5 text-left transition-colors duration-120 ease-boveda hover:bg-elevada"
                  >
                    <span className="flex items-center gap-3">
                      <CategoryIcon name={category?.icon ?? "ellipsis"} className="text-texto-2" />
                      <span className="min-w-0 flex-1 truncate text-interfaz">{category?.name ?? "Categoría"}</span>
                      <span
                        className={cn(
                          "cifras text-etiqueta",
                          status.level === "excedido" ? "text-negativo-texto" : status.level === "alerta" ? "text-laton" : "text-texto-2",
                        )}
                      >
                        {formatPercent(status.ratio, 0, "auto")}
                      </span>
                    </span>
                    <ProgressBar ratio={status.ratio} level={status.level} />
                    <span className="flex justify-between gap-3 text-etiqueta text-texto-2">
                      <span>
                        <Amount cents={status.spentCents} className="text-texto" /> de <Amount cents={status.limitCents} />
                      </span>
                      <span>
                        {status.remainingCents >= 0 ? (
                          <>
                            Quedan <Amount cents={status.remainingCents} />
                          </>
                        ) : (
                          <>
                            Te pasaste por <Amount cents={-status.remainingCents} className="text-negativo-texto" />
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Plantilla 50/30/20"
        action={
          <Button variant="fantasma" onClick={() => setEditingRule(true)}>
            Ajustar
          </Button>
        }
      >
        <p className="text-etiqueta text-texto-2">
          Una guía para repartir tu ingreso: necesidades, deseos y ahorro e inversión. El grupo de cada categoría se
          cambia en Finanzas → Categorías.
        </p>
        {breakdown ? (
          <>
            <p className="text-interfaz">
              Ingreso base: <Amount cents={breakdown.incomeCents} className="font-medium" />{" "}
              <span className="text-texto-2">
                {currentRule.incomeCents === null && average
                  ? `(tu promedio de ${average.months === 1 ? "1 mes" : `${average.months} meses`})`
                  : "(lo escribiste tú)"}
              </span>
            </p>
            <RuleRow label="Necesidades" line={breakdown.needs} />
            <RuleRow label="Deseos" line={breakdown.wants} />
            <RuleRow label="Ahorro e inversión" line={breakdown.savings} savings />
            {breakdown.ungroupedCents > 0 ? (
              <p className="text-etiqueta text-texto-2">
                <Amount cents={breakdown.ungroupedCents} /> en categorías sin grupo (como “Otros gastos”) se restan de tu
                ahorro.
              </p>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="Falta tu ingreso base"
            description="Se calcula con el promedio de tus ingresos de los últimos 3 meses. Mientras tanto, escríbelo en Ajustar."
          />
        )}
      </Panel>

      {editing ? (
        <BudgetSheet editing={editing} budgets={budgets} categories={categories} onClose={() => setEditing(null)} />
      ) : null}
      {editingRule ? (
        <RuleSheet rule={currentRule} average={average?.cents ?? null} onClose={() => setEditingRule(false)} />
      ) : null}
    </>
  );
}

function RuleRow({ label, line, savings }: { label: string; line: RuleLine; savings?: boolean }) {
  const ratio = line.limitCents > 0 ? line.actualCents / line.limitCents : 0;
  // En ahorro, llegar a la meta es bueno; en gasto, pasarse no.
  const level: BudgetLevel = savings
    ? ratio >= 1
      ? "ok"
      : "alerta"
    : line.actualCents >= line.limitCents
      ? "excedido"
      : line.actualCents * 5 >= line.limitCents * 4
        ? "alerta"
        : "ok";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-interfaz">
        <span>
          {label} <span className="cifras text-texto-2">{line.percent}%</span>
        </span>
        <span className="cifras text-etiqueta text-texto-2">
          {savings ? "Te queda " : ""}
          <Amount cents={line.actualCents} className="text-texto" /> de <Amount cents={line.limitCents} />
        </span>
      </div>
      <ProgressBar ratio={Math.max(0, ratio)} level={level} />
    </div>
  );
}

function BudgetSheet({
  editing,
  budgets,
  categories,
  onClose,
}: {
  editing: Editing;
  budgets: Budget[];
  categories: Category[];
  onClose: () => void;
}) {
  const current = editing.kind === "editar" ? editing.budget : null;
  const available = categories.filter(
    (category) =>
      category.type === "gasto" &&
      category.parentId === null &&
      !category.archived &&
      (category.id === current?.categoryId || !budgets.some((budget) => budget.categoryId === category.id)),
  );
  const [categoryId, setCategoryId] = useState(current?.categoryId ?? available[0]?.id ?? "");
  const [amount, setAmount] = useState(current ? centsToKeypad(current.amountCents) : "");
  const [error, setError] = useState<string | null>(null);
  const name = categories.find((category) => category.id === categoryId)?.name ?? "";

  async function save() {
    if (!categoryId) return setError("Elige una categoría.");
    const parsed = parseAmountToCents(amount);
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.cents <= 0) return setError("Escribe un monto mayor a cero.");
    await putBudget({
      categoryId,
      amountCents: parsed.cents,
      createdAt: current?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    onClose();
    showToast({ message: `Presupuesto de ${name}: ${formatMoney(parsed.cents, "MXN")} al mes` });
  }

  async function remove() {
    if (!current) return;
    await deleteBudget(current.categoryId);
    onClose();
    showToast({ message: `Presupuesto de ${name} quitado`, action: { label: "Deshacer", run: () => putBudget(current) } });
  }

  return (
    <Sheet
      title={current ? `Presupuesto de ${name}` : "Agregar presupuesto"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar presupuesto
          </Button>
          {current ? (
            <Button variant="fantasma" className="w-full" onClick={() => void remove()}>
              Quitar presupuesto
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
        {!current ? (
          available.length === 0 ? (
            <p className="text-interfaz text-texto-2">Todas tus categorías de gasto ya tienen presupuesto.</p>
          ) : (
            <Field id="presupuesto-categoria" label="Categoría">
              <Select id="presupuesto-categoria" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {available.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          )
        ) : null}
        <Field id="presupuesto-monto" label="Límite al mes (pesos)" hint="Incluye sus subcategorías.">
          <Input
            id="presupuesto-monto"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej. 4,000"
            value={amount}
            aria-describedby="presupuesto-monto-ayuda"
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function RuleSheet({ rule, average, onClose }: { rule: BudgetRule; average: number | null; onClose: () => void }) {
  const [useAverage, setUseAverage] = useState(rule.incomeCents === null);
  const [income, setIncome] = useState(rule.incomeCents ? centsToKeypad(rule.incomeCents) : "");
  const [needs, setNeeds] = useState(String(rule.needs));
  const [wants, setWants] = useState(String(rule.wants));
  const [savings, setSavings] = useState(String(rule.savings));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const percents = [needs, wants, savings].map((value) => Number(value));
    if (percents.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
      return setError("Escribe porcentajes enteros entre 0 y 100.");
    }
    const [n = 0, w = 0, s = 0] = percents;
    if (n + w + s !== 100) return setError(`Los tres deben sumar 100%. Ahora suman ${n + w + s}%.`);
    let incomeCents: number | null = null;
    if (!useAverage) {
      const parsed = parseAmountToCents(income);
      if (!parsed.ok) return setError(parsed.error);
      if (parsed.cents <= 0) return setError("Escribe tu ingreso mensual.");
      incomeCents = parsed.cents;
    }
    await setSetting("budgetRule", { incomeCents, needs: n, wants: w, savings: s });
    onClose();
    showToast({ message: "Plantilla guardada" });
  }

  return (
    <Sheet
      title="Ajustar plantilla"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar plantilla
          </Button>
          <Button
            variant="fantasma"
            className="w-full"
            onClick={() => {
              setNeeds("50");
              setWants("30");
              setSavings("20");
              setError(null);
            }}
          >
            Volver a 50/30/20
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
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-etiqueta font-medium text-texto-2">Ingreso base</legend>
          <label className="flex min-h-11 items-center gap-3 text-interfaz">
            <input type="radio" name="ingreso" checked={useAverage} onChange={() => setUseAverage(true)} className="size-5 accent-laton" />
            Mi promedio real {average ? `(${formatMoney(average, "MXN")})` : "(aún sin datos)"}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-interfaz">
            <input type="radio" name="ingreso" checked={!useAverage} onChange={() => setUseAverage(false)} className="size-5 accent-laton" />
            Escribirlo yo
          </label>
          {!useAverage ? (
            <Input
              aria-label="Ingreso mensual"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ej. 25,000"
              value={income}
              onChange={(event) => {
                setIncome(event.target.value);
                setError(null);
              }}
            />
          ) : null}
        </fieldset>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "regla-necesidades", label: "Necesidades %", value: needs, set: setNeeds },
            { id: "regla-deseos", label: "Deseos %", value: wants, set: setWants },
            { id: "regla-ahorro", label: "Ahorro %", value: savings, set: setSavings },
          ].map((item) => (
            <Field key={item.id} id={item.id} label={item.label}>
              <Input
                id={item.id}
                inputMode="numeric"
                value={item.value}
                onChange={(event) => {
                  item.set(event.target.value);
                  setError(null);
                }}
              />
            </Field>
          ))}
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
