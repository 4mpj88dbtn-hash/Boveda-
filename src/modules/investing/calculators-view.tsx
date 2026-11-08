"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Field, Input } from "@/components/ui/field";
import { LineChart } from "@/components/ui/line-chart";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  averageCost,
  cagr,
  feeImpact,
  futureValue,
  inTodaysMoney,
  realRate,
  requiredMonthly,
  ruleOf72,
  xirr,
  yearlyProjection,
  type Timing,
} from "./lib/calculators";

const mxn = (value: number) => (Number.isFinite(value) ? formatMoney(Math.round(value * 100), "MXN") : "—");
const pct = (value: number | null, digits = 2) => (value === null || !Number.isFinite(value) ? "—" : formatPercent(value, digits, "auto"));

/** Lee un número escrito con comas de miles; vacío o inválido = NaN. */
const num = (text: string) => Number(text.replace(/,/g, "").trim() || "NaN");

function NumberInput({ id, label, value, onChange, suffix }: { id: string; label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <Field id={id} label={suffix ? `${label} (${suffix})` : label}>
      <Input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function TimingToggle({ value, onChange }: { value: Timing; onChange: (value: Timing) => void }) {
  return (
    <div role="group" aria-label="Cuándo aportas" className="flex flex-wrap gap-2">
      {(["fin", "inicio"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn("h-11 rounded-full border px-4 text-etiqueta", value === option ? "border-laton text-texto" : "border-borde-control text-texto-2")}
        >
          Aporto al {option === "fin" ? "final" : "inicio"} del mes
        </button>
      ))}
    </div>
  );
}

function Result({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-interfaz text-texto-2">{label}</dt>
      <dd className={cn("cifras text-right", strong ? "font-serif text-cifra font-semibold" : "text-interfaz")}>{value}</dd>
    </div>
  );
}

function Explain({ formula, children }: { formula: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-control bg-fondo p-3">
      <code className="overflow-x-auto whitespace-pre font-mono text-nota text-laton">{formula}</code>
      <p className="text-etiqueta text-texto-2">{children}</p>
    </div>
  );
}

/** Las 10 calculadoras de §4.2, con su fórmula y una explicación sencilla. */
export function CalculatorsView() {
  // 1, 2 y 3 comparten lo básico de tu plan.
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("3000");
  const [rate, setRate] = useState("8");
  const [years, setYears] = useState("20");
  const [timing, setTiming] = useState<Timing>("fin");
  const base = { initial: num(initial), monthly: num(monthly), annualRate: num(rate) / 100, timing };
  const months = Math.round(num(years) * 12);
  const fv = futureValue({ ...base, months });
  const contributed = base.initial + base.monthly * months;

  const [scenarios, setScenarios] = useState(["6", "8", "10"]);
  const projections = scenarios.map((value) => yearlyProjection({ ...base, annualRate: num(value) / 100 }, Math.max(1, Math.min(60, Math.round(num(years))))));

  const [inflation, setInflation] = useState("4");
  const real = realRate(base.annualRate, num(inflation) / 100);

  const [cagrStart, setCagrStart] = useState("100000");
  const [cagrEnd, setCagrEnd] = useState("180000");
  const [cagrYears, setCagrYears] = useState("5");

  const [flows, setFlows] = useState([
    { date: "2025-01-15", amount: "-10000" },
    { date: "2025-07-15", amount: "-10000" },
    { date: "2026-01-15", amount: "22000" },
  ]);
  const xirrValue = xirr(flows.map((flow) => ({ date: flow.date, amount: num(flow.amount) })).filter((flow) => Number.isFinite(flow.amount)));

  const [rule72, setRule72] = useState("8");
  const doubling = ruleOf72(num(rule72) / 100);

  const [buys, setBuys] = useState([
    { amount: "3000", shares: "5" },
    { amount: "3000", shares: "6" },
  ]);
  const average = averageCost(buys.map((buy) => ({ amount: num(buy.amount), shares: num(buy.shares) })).filter((buy) => Number.isFinite(buy.amount) && Number.isFinite(buy.shares)));

  const fees = feeImpact({ initial: base.initial, monthly: base.monthly, timing }, base.annualRate, [0.0003, 0.005, 0.015], [20, 30]);

  const [target, setTarget] = useState("2000000");
  const [targetYears, setTargetYears] = useState("15");
  const needed = requiredMonthly({ target: num(target), initial: base.initial, annualRate: base.annualRate, months: Math.round(num(targetYears) * 12), timing });

  return (
    <>
      <p className="max-w-[65ch] text-interfaz text-texto-2">
        Los números de ejemplo se pueden cambiar. Son proyecciones: el mercado no rinde lo mismo cada año y los rendimientos
        pasados no garantizan los futuros.
      </p>

      <Panel title="1. Interés compuesto con aportaciones">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberInput id="c1-inicial" label="Capital inicial" suffix="$" value={initial} onChange={setInitial} />
          <NumberInput id="c1-mensual" label="Aportación mensual" suffix="$" value={monthly} onChange={setMonthly} />
          <NumberInput id="c1-tasa" label="Rendimiento anual" suffix="%" value={rate} onChange={setRate} />
          <NumberInput id="c1-anios" label="Años" value={years} onChange={setYears} />
        </div>
        <TimingToggle value={timing} onChange={setTiming} />
        <dl className="divide-y divide-borde">
          <Result label="Tendrías" value={mxn(fv)} strong />
          <Result label="Aportaste" value={mxn(contributed)} />
          <Result label="Ganado por rendimientos" value={mxn(fv - contributed)} />
        </dl>
        <Explain formula={"VF = VP × (1 + i)^n + A × [((1 + i)^n − 1) / i]\ni = (1 + tasa anual)^(1/12) − 1"}>
          Tu capital inicial crece mes a mes, y cada aportación crece desde el mes en que la haces. Si aportas al inicio del
          mes, cada aportación gana un mes más (se multiplica por 1 + i).
        </Explain>
      </Panel>

      <Panel title="2. Tres escenarios">
        <div className="grid grid-cols-3 gap-3">
          {(["Conservador", "Moderado", "Optimista"] as const).map((name, index) => (
            <NumberInput
              key={name}
              id={`c2-${index}`}
              label={name}
              suffix="%"
              value={scenarios[index] ?? ""}
              onChange={(value) => setScenarios((list) => list.map((item, position) => (position === index ? value : item)))}
            />
          ))}
        </div>
        {projections[0] && projections[0].length > 1 ? (
          <LineChart
            ariaLabel="Valor de tu inversión año por año en tres escenarios"
            labels={projections[0].map((row) => `Año ${row.year}`)}
            format={(value) => mxn(value).replace(/\.\d{2}$/, "")}
            series={[
              { label: "Aportado", color: "texto-2", dashed: true, values: projections[0].map((row) => row.contributed) },
              { label: `Conservador ${scenarios[0]}%`, color: "acero", values: projections[0].map((row) => row.value) },
              { label: `Moderado ${scenarios[1]}%`, color: "laton", values: (projections[1] ?? []).map((row) => row.value) },
              { label: `Optimista ${scenarios[2]}%`, color: "positivo", values: (projections[2] ?? []).map((row) => row.value) },
            ]}
          />
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-etiqueta">
            <thead>
              <tr className="text-left text-texto-2">
                <th className="py-1.5 font-medium">Año</th>
                <th className="py-1.5 text-right font-medium">Aportado</th>
                {scenarios.map((value, index) => (
                  <th key={index} className="py-1.5 text-right font-medium">
                    {value}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="cifras">
              {(projections[0] ?? []).map((row, index) => (
                <tr key={row.year} className="border-t border-borde">
                  <td className="py-1.5">{row.year}</td>
                  <td className="py-1.5 text-right">{mxn(row.contributed)}</td>
                  {projections.map((projection, position) => (
                    <td key={position} className="py-1.5 text-right">
                      {mxn(projection[index]?.value ?? NaN)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-nota text-texto-2">Usa el capital, la aportación y los años de la calculadora 1.</p>
      </Panel>

      <Panel title="3. Rendimiento real (descontando inflación)">
        <NumberInput id="c3-inflacion" label="Inflación anual esperada" suffix="%" value={inflation} onChange={setInflation} />
        <dl className="divide-y divide-borde">
          <Result label={`Rendimiento real con ${rate}% nominal`} value={pct(real)} strong />
          <Result label={`Lo de la calculadora 1, en pesos de hoy`} value={mxn(inTodaysMoney(fv, num(inflation) / 100, num(years)))} />
        </dl>
        <Explain formula={"r_real = (1 + r_nominal) / (1 + inflación) − 1"}>
          Lo que de verdad crece tu poder de compra. Restar la inflación es una aproximación; esta fórmula es la exacta.
        </Explain>
      </Panel>

      <Panel title="4. CAGR (crecimiento anual compuesto)">
        <div className="grid grid-cols-3 gap-3">
          <NumberInput id="c4-inicio" label="Valor inicial" suffix="$" value={cagrStart} onChange={setCagrStart} />
          <NumberInput id="c4-final" label="Valor final" suffix="$" value={cagrEnd} onChange={setCagrEnd} />
          <NumberInput id="c4-anios" label="Años" value={cagrYears} onChange={setCagrYears} />
        </div>
        <dl>
          <Result label="CAGR" value={pct(cagr(num(cagrStart), num(cagrEnd), num(cagrYears)))} strong />
        </dl>
        <Explain formula={"CAGR = (final / inicial)^(1 / años) − 1"}>
          La tasa anual pareja que te habría llevado del valor inicial al final. Sirve para comparar inversiones de distinta
          duración.
        </Explain>
      </Panel>

      <Panel title="5. XIRR (rendimiento con fechas)">
        <div className="flex flex-col gap-2">
          {flows.map((flow, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label={`Fecha ${index + 1}`}
                value={flow.date}
                onChange={(event) => setFlows((list) => list.map((item, position) => (position === index ? { ...item, date: event.target.value } : item)))}
              />
              <Input
                inputMode="decimal"
                aria-label={`Monto ${index + 1}`}
                value={flow.amount}
                onChange={(event) => setFlows((list) => list.map((item, position) => (position === index ? { ...item, amount: event.target.value } : item)))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFlows((list) => [...list, { date: list.at(-1)?.date ?? "2026-01-01", amount: "0" }].slice(0, 12))}
            className="flex min-h-11 items-center self-start text-etiqueta font-medium text-laton"
          >
            Agregar fecha
          </button>
        </div>
        <dl>
          <Result label="XIRR" value={pct(xirrValue)} strong />
        </dl>
        <Explain formula={"Σ monto_k / (1 + r)^(días_k / 365) = 0"}>
          Lo que pones va en negativo y lo que recibes (o lo que vale hoy) en positivo. Encuentra la tasa anual que cuadra
          todo considerando cuándo entró cada peso. Tu XIRR real está en Portafolio.
        </Explain>
      </Panel>

      <Panel title="6. Regla del 72">
        <NumberInput id="c6-tasa" label="Rendimiento anual" suffix="%" value={rule72} onChange={setRule72} />
        <dl className="divide-y divide-borde">
          <Result label="Años para duplicar (aprox.)" value={doubling ? doubling.approx.toFixed(1) : "—"} strong />
          <Result label="Cálculo exacto" value={doubling ? doubling.exact.toFixed(2) : "—"} />
        </dl>
        <Explain formula={"años ≈ 72 / tasa %      exacto: ln 2 / ln(1 + r)"}>Un atajo mental para saber en cuánto se duplica tu dinero.</Explain>
      </Panel>

      <Panel title="7. Costo promedio (DCA)">
        <div className="flex flex-col gap-2">
          {buys.map((buy, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input
                inputMode="decimal"
                aria-label={`Monto invertido ${index + 1}`}
                value={buy.amount}
                onChange={(event) => setBuys((list) => list.map((item, position) => (position === index ? { ...item, amount: event.target.value } : item)))}
              />
              <Input
                inputMode="decimal"
                aria-label={`Títulos ${index + 1}`}
                value={buy.shares}
                onChange={(event) => setBuys((list) => list.map((item, position) => (position === index ? { ...item, shares: event.target.value } : item)))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBuys((list) => [...list, { amount: "3000", shares: "5" }].slice(0, 24))}
            className="flex min-h-11 items-center self-start text-etiqueta font-medium text-laton"
          >
            Agregar compra
          </button>
        </div>
        <dl>
          <Result label="Costo promedio por título" value={average === null ? "—" : mxn(average)} strong />
        </dl>
        <Explain formula={"Costo promedio = total invertido / total de títulos"}>
          Invertir la misma cantidad cada mes compra más títulos cuando el precio baja y menos cuando sube, así tu costo
          promedio queda por debajo del promedio simple de los precios.
        </Explain>
      </Panel>

      <Panel title="8. Impacto de comisiones">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-etiqueta">
            <thead>
              <tr className="text-left text-texto-2">
                <th className="py-1.5 font-medium">Comisión anual</th>
                <th className="py-1.5 text-right font-medium">A 20 años</th>
                <th className="py-1.5 text-right font-medium">A 30 años</th>
              </tr>
            </thead>
            <tbody className="cifras">
              {fees.map((row) => (
                <tr key={row.fee} className="border-t border-borde">
                  <td className="py-1.5">{formatPercent(row.fee, 2, "auto")}</td>
                  {row.values.map((cell) => (
                    <td key={cell.year} className="py-1.5 text-right">
                      {mxn(cell.value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Explain formula={"rendimiento neto = (1 + r) × (1 − comisión) − 1"}>
          Con el capital, la aportación y el rendimiento de la calculadora 1. La comisión se cobra cada año sobre todo lo que
          tienes, por eso una diferencia que parece pequeña pesa mucho a 30 años.
        </Explain>
      </Panel>

      <Panel title="9. ¿Cuánto invertir al mes para llegar a tu meta?">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput id="c9-meta" label="Meta" suffix="$" value={target} onChange={setTarget} />
          <NumberInput id="c9-anios" label="En años" value={targetYears} onChange={setTargetYears} />
        </div>
        <dl>
          <Result label="Aportación mensual necesaria" value={mxn(needed)} strong />
        </dl>
        <Explain formula={"A = (VF − VP × (1 + i)^n) × i / ((1 + i)^n − 1)"}>
          Usa tu capital inicial, el rendimiento y el momento de aportar de la calculadora 1. Si con lo que ya tienes alcanzas,
          la respuesta es $0.
        </Explain>
      </Panel>

      <Panel title="10. Simulador histórico">
        <p className="text-interfaz text-texto-2">
          ¿Cuánto tendrías si hubieras invertido cada mes desde cierto año? Con datos reales del S&P 500.
        </p>
        <Link href="/inversion/simulador" className="text-interfaz font-medium text-laton underline-offset-4 hover:underline">
          Abrir el simulador
        </Link>
      </Panel>

      <EducationalNotice />
    </>
  );
}
