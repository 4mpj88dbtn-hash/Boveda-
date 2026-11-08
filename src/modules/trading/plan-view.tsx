"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { showToast } from "@/components/ui/toast";
import { formatDate, todayInCancun } from "@/lib/dates";
import { formatMoney, parseAmountToCents } from "@/lib/money";
import { setSetting, useSetting } from "@/lib/settings";
import { saveTradingRules, useTradingRules } from "./data";
import { maxRiskCents } from "./lib/trades";
import { CHECKLIST } from "./order-sheet";
import { tradingRulesSchema, type TradingPlan, type TradingRules } from "./types";

const PLAN_FIELDS: { key: keyof Omit<TradingPlan, "updatedAt">; label: string; placeholder: string }[] = [
  { key: "instruments", label: "Qué opero", placeholder: "Ej. SPY y QQQ; nada de cripto hasta dominar las acciones." },
  { key: "schedule", label: "En qué horario", placeholder: "Ej. de 9:00 a 11:00 (Cancún); nunca en la primera media hora ni con datos fuertes." },
  { key: "entryRules", label: "Reglas de entrada", placeholder: "Ej. a favor de la tendencia, en un soporte, con vela de confirmación y volumen." },
  { key: "exitRules", label: "Reglas de salida", placeholder: "Ej. stop debajo del último mínimo; objetivo al doble del riesgo; no muevo el stop en contra." },
  { key: "maxRisk", label: "Riesgo máximo", placeholder: "Ej. 1% por operación, 3% al día, 6% a la semana; máximo 3 operaciones al día." },
];

/** Plan de trading escrito (§5.4), reglas de riesgo y checklist. */
export function PlanView() {
  const rules = useTradingRules();
  const plan = useSetting("tradingPlan");
  if (!rules || !plan) return null;
  return (
    <>
      <RulesPanel key={JSON.stringify(rules)} rules={rules} />
      <PlanPanel key={plan.value?.updatedAt ?? 0} plan={plan.value ?? null} />
      <Panel title="Checklist antes de cada operación">
        <ol className="flex flex-col gap-2 text-interfaz">
          {CHECKLIST.map((item, index) => (
            <li key={item.id} className="flex gap-3">
              <span className="cifras w-5 shrink-0 text-texto-2">{index + 1}.</span>
              <span>
                {item.label}
                {item.auto ? <span className="text-texto-2"> (la app lo revisa)</span> : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-etiqueta text-texto-2">En el Simulador no se abre una operación sin marcar el checklist.</p>
      </Panel>
      <EducationalNotice />
    </>
  );
}

function RulesPanel({ rules }: { rules: TradingRules }) {
  const [capital, setCapital] = useState((rules.simCapitalCents / 100).toFixed(2));
  const [risk, setRisk] = useState(String(rules.riskPercent));
  const [daily, setDaily] = useState(String(rules.dailyLossPercent));
  const [weekly, setWeekly] = useState(String(rules.weeklyLossPercent));
  const [currency, setCurrency] = useState(rules.realCurrency);
  const [realCapital, setRealCapital] = useState(rules.realCapitalCents === null ? "" : (rules.realCapitalCents / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const sim = parseAmountToCents(capital);
    if (!sim.ok) return setError(`Capital ficticio: ${sim.error}`);
    const real = realCapital.trim() === "" ? { ok: true as const, cents: null } : parseAmountToCents(realCapital);
    if (!real.ok) return setError(`Capital real: ${real.error}`);
    const parsed = tradingRulesSchema.safeParse({
      simCapitalCents: sim.cents,
      riskPercent: Number(risk.replace(",", ".")),
      dailyLossPercent: Number(daily.replace(",", ".")),
      weeklyLossPercent: Number(weekly.replace(",", ".")),
      realCurrency: currency,
      realCapitalCents: real.cents === 0 ? null : real.cents,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return setError(
        field === "riskPercent"
          ? "El riesgo por operación va de 0.1% a 2%."
          : field === "dailyLossPercent"
            ? "El límite del día va de 0.5% a 10%."
            : field === "weeklyLossPercent"
              ? "El límite de la semana va de 1% a 20%."
              : "El capital ficticio va de $100 a $100,000,000.",
      );
    }
    if (parsed.data.weeklyLossPercent < parsed.data.dailyLossPercent) return setError("El límite de la semana no puede ser menor que el del día.");
    setError(null);
    await saveTradingRules(parsed.data);
    showToast({ message: "Reglas guardadas" });
  }

  return (
    <Panel title="Reglas de riesgo">
      <p className="text-etiqueta text-texto-2">
        Valores de inicio sugeridos: 1% por operación, 3% al día y 6% a la semana. Puedes ajustarlos, pero el riesgo por operación no
        pasa de 2%.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="regla-capital" label="Capital ficticio (USD)" hint="El del Simulador.">
          <Input id="regla-capital" inputMode="decimal" autoComplete="off" value={capital} onChange={(event) => setCapital(event.target.value)} />
        </Field>
        <Field id="regla-riesgo" label="Riesgo por operación (%)">
          <Input id="regla-riesgo" inputMode="decimal" autoComplete="off" value={risk} onChange={(event) => setRisk(event.target.value)} />
        </Field>
        <Field id="regla-dia" label="Límite de pérdida del día (%)">
          <Input id="regla-dia" inputMode="decimal" autoComplete="off" value={daily} onChange={(event) => setDaily(event.target.value)} />
        </Field>
        <Field id="regla-semana" label="Límite de pérdida de la semana (%)">
          <Input id="regla-semana" inputMode="decimal" autoComplete="off" value={weekly} onChange={(event) => setWeekly(event.target.value)} />
        </Field>
        <Field id="regla-moneda" label="Moneda de tu cuenta real">
          <Select id="regla-moneda" value={currency} onChange={(event) => setCurrency(event.target.value === "USD" ? "USD" : "MXN")}>
            <option value="MXN">Pesos (MXN)</option>
            <option value="USD">Dólares (USD)</option>
          </Select>
        </Field>
        <Field id="regla-capital-real" label="Capital real (opcional)" hint="Para tu curva y drawdown reales.">
          <Input id="regla-capital-real" inputMode="decimal" autoComplete="off" value={realCapital} onChange={(event) => setRealCapital(event.target.value)} />
        </Field>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button className="self-start" onClick={() => void save()}>
        Guardar reglas
      </Button>
      <p className="text-nota text-texto-2">
        Con tus reglas actuales arriesgas como máximo {formatMoney(maxRiskCents(rules.simCapitalCents, rules.riskPercent), "USD")} por operación en el Simulador.
        Cambiar el capital no borra tus operaciones.
      </p>
    </Panel>
  );
}

function PlanPanel({ plan }: { plan: TradingPlan | null }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(PLAN_FIELDS.map((field) => [field.key, plan?.[field.key] ?? ""])));
  const [saved, setSaved] = useState(false);

  async function save() {
    await setSetting("tradingPlan", {
      instruments: (values.instruments ?? "").trim(),
      schedule: (values.schedule ?? "").trim(),
      entryRules: (values.entryRules ?? "").trim(),
      exitRules: (values.exitRules ?? "").trim(),
      maxRisk: (values.maxRisk ?? "").trim(),
      updatedAt: Date.now(),
    });
    setSaved(true);
    showToast({ message: "Plan guardado" });
  }

  return (
    <Panel title="Mi plan de trading">
      <p className="text-etiqueta text-texto-2">
        Escríbelo con calma, fuera del horario de mercado. Antes de cada operación, pregúntate si cumple tu plan.
        {plan ? ` Última versión: ${formatDate(todayInCancun(new Date(plan.updatedAt)))}.` : ""}
      </p>
      {PLAN_FIELDS.map((field) => (
        <Field key={field.key} id={`plan-${field.key}`} label={field.label}>
          <Textarea
            id={`plan-${field.key}`}
            maxLength={1000}
            placeholder={field.placeholder}
            value={values[field.key] ?? ""}
            onChange={(event) => {
              setValues({ ...values, [field.key]: event.target.value });
              setSaved(false);
            }}
          />
        </Field>
      ))}
      <Button className="self-start" onClick={() => void save()}>
        {saved ? <Check aria-hidden className="size-4" /> : null}
        Guardar plan
      </Button>
    </Panel>
  );
}
