"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/money";
import { deleteRecurring, deleteTemplate, putRecurring, putTemplate, useAccounts, useCategories, useRecurring, useTemplates } from "./data";
import { CategoryIcon } from "./icons";
import { centsToKeypad } from "./lib/keypad";
import { needsFxRate } from "./lib/transactions";
import { runRecurring } from "./recurring-runner";
import { openTransactionSheet } from "./sheet-store";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  RECURRING_MODE_LABELS,
  RECURRING_MODES,
  TRANSACTION_TYPE_LABELS,
  type Account,
  type Category,
  type Frequency,
  type Recurring,
  type RecurringMode,
  type Template,
} from "./types";

/** Movimientos que se repiten solos y plantillas de los frecuentes. */
export function RecurringView() {
  const rules = useRecurring();
  const templates = useTemplates();
  const categories = useCategories();
  const accounts = useAccounts();
  const [editingRule, setEditingRule] = useState<Recurring | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  if (!rules || !templates || !categories || !accounts) return null;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const label = (categoryId: string | null, note: string, fallback: string) =>
    (categoryId ? byId.get(categoryId)?.name : undefined) ?? (note || fallback);

  return (
    <>
      <Panel
        title="Recurrentes"
        action={
          <Button variant="fantasma" onClick={() => openTransactionSheet({ kind: "nuevo", repeat: "mensual" })}>
            <Plus aria-hidden className="size-5" />
            Agregar
          </Button>
        }
      >
        <p className="text-etiqueta text-texto-2">
          Renta, suscripciones y pagos fijos. Se registran solos en su fecha o te piden confirmación en el Centro de mando.
        </p>
        {rules.length === 0 ? (
          <EmptyState
            title="Sin recurrentes"
            description="Toca Agregar, registra el movimiento como siempre y elige cada cuánto se repite."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {rules.map((rule) => (
              <li key={rule.id}>
                <button
                  type="button"
                  onClick={() => setEditingRule(rule)}
                  className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left"
                >
                  <CategoryIcon name={(rule.template.categoryId && byId.get(rule.template.categoryId)?.icon) || "repeat"} className="text-texto-2" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-interfaz">
                      {label(rule.template.categoryId, rule.template.note, TRANSACTION_TYPE_LABELS[rule.template.type])}
                    </span>
                    <span className="truncate text-etiqueta text-texto-2">
                      {rule.active
                        ? `${FREQUENCY_LABELS[rule.frequency]} · siguiente: ${formatDate(rule.nextDate)} · ${RECURRING_MODE_LABELS[rule.mode].toLowerCase()}`
                        : `En pausa · ${FREQUENCY_LABELS[rule.frequency]}`}
                    </span>
                  </span>
                  <Amount cents={rule.template.amountCents} currency={rule.template.currency} className="text-interfaz" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Plantillas"
        action={
          <Button variant="fantasma" onClick={() => openTransactionSheet({ kind: "nuevo", asTemplate: true })}>
            <Plus aria-hidden className="size-5" />
            Agregar
          </Button>
        }
      >
        <p className="text-etiqueta text-texto-2">
          Tus gastos frecuentes a un toque: aparecen arriba en el registro rápido.
        </p>
        {templates.length === 0 ? (
          <EmptyState
            title="Sin plantillas"
            description="Al registrar, abre Más detalles y marca “Guardar también como plantilla”."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(template)}
                  className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left"
                >
                  <CategoryIcon name={(template.categoryId && byId.get(template.categoryId)?.icon) || "tag"} className="text-texto-2" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-interfaz">{template.name}</span>
                    <span className="truncate text-etiqueta text-texto-2">
                      {label(template.categoryId, template.note, TRANSACTION_TYPE_LABELS[template.type])}
                    </span>
                  </span>
                  {template.amountCents !== null ? (
                    <Amount cents={template.amountCents} currency={template.currency} className="text-interfaz" />
                  ) : (
                    <span className="text-etiqueta text-texto-2">Monto libre</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editingRule ? (
        <RecurringSheet rule={editingRule} accounts={accounts} categories={categories} onClose={() => setEditingRule(null)} />
      ) : null}
      {editingTemplate ? <TemplateSheet template={editingTemplate} onClose={() => setEditingTemplate(null)} /> : null}
    </>
  );
}

function RecurringSheet({
  rule,
  accounts,
  categories,
  onClose,
}: {
  rule: Recurring;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
}) {
  const [frequency, setFrequency] = useState<Frequency>(rule.frequency);
  const [mode, setMode] = useState<RecurringMode>(rule.mode);
  const [nextDate, setNextDate] = useState(rule.nextDate);
  const [amount, setAmount] = useState(centsToKeypad(rule.template.amountCents));
  const [error, setError] = useState<string | null>(null);
  const currencies = accounts
    .filter((account) => account.id === rule.template.accountId || account.id === rule.template.toAccountId)
    .map((account) => account.currency);
  const dollars = needsFxRate(rule.template.currency, currencies);
  const name = categories.find((category) => category.id === rule.template.categoryId)?.name ?? rule.template.note ?? "Recurrente";

  async function save(active = rule.active) {
    const parsed = parseAmountToCents(amount);
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.cents <= 0) return setError("Escribe un monto mayor a cero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return setError("Elige la siguiente fecha.");
    // La fecha que elijas se vuelve el nuevo punto de partida de la regla.
    const changedSchedule = frequency !== rule.frequency || nextDate !== rule.nextDate;
    await putRecurring({
      ...rule,
      frequency,
      mode: dollars ? "confirmar" : mode,
      startDate: changedSchedule ? nextDate : rule.startDate,
      nextDate,
      active,
      template: { ...rule.template, amountCents: parsed.cents },
    });
    await runRecurring();
    onClose();
    showToast({ message: active === rule.active ? "Recurrente guardado" : active ? "Recurrente reanudado" : "Recurrente en pausa" });
  }

  async function remove() {
    await deleteRecurring(rule.id);
    onClose();
    showToast({ message: "Recurrente eliminado", action: { label: "Deshacer", run: () => putRecurring(rule) } });
  }

  return (
    <Sheet
      title={name}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar recurrente
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secundario" onClick={() => void save(!rule.active)}>
              {rule.active ? "Pausar" : "Reanudar"}
            </Button>
            <Button variant="fantasma" className="text-negativo-texto" onClick={() => void remove()}>
              Eliminar
            </Button>
          </div>
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
        <Field id="recurrente-monto" label={`Monto (${rule.template.currency})`}>
          <Input
            id="recurrente-monto"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field id="recurrente-frecuencia" label="Se repite">
          <Select id="recurrente-frecuencia" value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
            {FREQUENCIES.map((option) => (
              <option key={option} value={option}>
                {FREQUENCY_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="recurrente-siguiente" label="Siguiente fecha">
          <Input id="recurrente-siguiente" type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
        </Field>
        <Field
          id="recurrente-modo"
          label="Cómo registrarlo"
          hint={dollars ? "Con dólares siempre te pide confirmación, para que revises el tipo de cambio." : undefined}
        >
          <Select
            id="recurrente-modo"
            value={dollars ? "confirmar" : mode}
            disabled={dollars}
            onChange={(event) => setMode(event.target.value as RecurringMode)}
          >
            {RECURRING_MODES.map((option) => (
              <option key={option} value={option}>
                {RECURRING_MODE_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function TemplateSheet({ template, onClose }: { template: Template; onClose: () => void }) {
  const [name, setName] = useState(template.name);
  const [amount, setAmount] = useState(template.amountCents ? centsToKeypad(template.amountCents) : "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (trimmed === "") return setError("Escribe un nombre.");
    let amountCents: number | null = null;
    if (amount.trim() !== "") {
      const parsed = parseAmountToCents(amount);
      if (!parsed.ok) return setError(parsed.error);
      amountCents = parsed.cents > 0 ? parsed.cents : null;
    }
    await putTemplate({ ...template, name: trimmed.slice(0, 30), amountCents });
    onClose();
    showToast({ message: "Plantilla guardada" });
  }

  async function remove() {
    await deleteTemplate(template.id);
    onClose();
    showToast({ message: "Plantilla eliminada", action: { label: "Deshacer", run: () => putTemplate(template) } });
  }

  return (
    <Sheet
      title="Plantilla"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar plantilla
          </Button>
          <Button variant="fantasma" className="w-full text-negativo-texto" onClick={() => void remove()}>
            Eliminar plantilla
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
        <Field id="plantilla-nombre" label="Nombre">
          <Input
            id="plantilla-nombre"
            value={name}
            maxLength={30}
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field id="plantilla-monto" label={`Monto (${template.currency}, opcional)`} hint="Déjalo vacío para escribirlo cada vez.">
          <Input
            id="plantilla-monto"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            aria-describedby="plantilla-monto-ayuda"
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
