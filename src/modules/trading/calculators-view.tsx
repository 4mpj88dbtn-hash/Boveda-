"use client";

import { useState } from "react";
import { Explain, num, NumberInput, Result } from "@/components/ui/calculator";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatPercent } from "@/lib/money";
import { expectancy, formatRatio, positionSize, profitFactor, riskAmount, riskReward } from "./lib/calculators";

const usd = (value: number) =>
  Number.isFinite(value) ? `USD ${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const decimal = (value: number | null, digits = 2) =>
  value === null || !Number.isFinite(value) ? "—" : value.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Calculadoras de trading (§5.3), con su fórmula y una explicación sencilla. */
export function TradingCalculatorsView() {
  const [capital, setCapital] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("50");
  const [stop, setStop] = useState("48");
  const size = positionSize(num(capital), num(riskPct), num(entry), num(stop));
  const wholeShares = size === null ? null : Math.floor(size);

  const [rrEntry, setRrEntry] = useState("100");
  const [rrStop, setRrStop] = useState("95");
  const [rrTarget, setRrTarget] = useState("112");
  const rr = riskReward(num(rrEntry), num(rrStop), num(rrTarget));

  const [winRate, setWinRate] = useState("40");
  const [avgWin, setAvgWin] = useState("300");
  const [avgLoss, setAvgLoss] = useState("100");
  const e = expectancy(num(winRate) / 100, num(avgWin), num(avgLoss));

  const [gross, setGross] = useState("1500");
  const [grossLoss, setGrossLoss] = useState("1000");
  const pf = profitFactor(num(gross), num(grossLoss));

  const [peak, setPeak] = useState("11000");
  const [trough, setTrough] = useState("8800");
  const drawdown = num(peak) > 0 ? (num(peak) - num(trough)) / num(peak) : null;
  const recovery = drawdown !== null && drawdown < 1 ? drawdown / (1 - drawdown) : null;

  const [ruleCapital, setRuleCapital] = useState("10000");
  const [daily, setDaily] = useState("3");
  const [weekly, setWeekly] = useState("6");

  return (
    <>
      <p className="max-w-[65ch] text-interfaz text-texto-2">Los números de ejemplo se pueden cambiar. En el Simulador estas cuentas se hacen solas con tus reglas.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="1. Tamaño de posición">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput id="tp-capital" label="Capital" suffix="USD" value={capital} onChange={setCapital} />
            <NumberInput id="tp-riesgo" label="Riesgo" suffix="%" value={riskPct} onChange={setRiskPct} />
            <NumberInput id="tp-entrada" label="Entrada" value={entry} onChange={setEntry} />
            <NumberInput id="tp-stop" label="Stop loss" value={stop} onChange={setStop} />
          </div>
          <dl>
            <Result label="Títulos" value={wholeShares === null ? "—" : wholeShares.toLocaleString("es-MX")} strong />
            <Result label="Arriesgas" value={wholeShares === null ? "—" : usd(wholeShares * Math.abs(num(entry) - num(stop)))} />
          </dl>
          <Explain formula="Títulos = (Capital × % de riesgo) / (Entrada − Stop loss)">
            Primero decides cuánto puedes perder si el precio llega a tu stop; el tamaño sale de ahí. Con $10,000 y 1% arriesgas $100: si
            el stop está $2 abajo, son 50 títulos. Se redondea hacia abajo.
          </Explain>
        </Panel>

        <Panel title="2. Riesgo/beneficio">
          <div className="grid grid-cols-3 gap-3">
            <NumberInput id="rb-entrada" label="Entrada" value={rrEntry} onChange={setRrEntry} />
            <NumberInput id="rb-stop" label="Stop" value={rrStop} onChange={setRrStop} />
            <NumberInput id="rb-objetivo" label="Objetivo" value={rrTarget} onChange={setRrTarget} />
          </div>
          <dl>
            <Result label="Relación" value={rr === null ? "—" : formatRatio(rr)} strong />
          </dl>
          <p className="text-etiqueta">
            {rr === null ? "El stop y el objetivo deben quedar de lados opuestos de la entrada." : rr >= 2 ? "Cumple el mínimo sugerido de 1:2." : "Menor al mínimo sugerido de 1:2."}
          </p>
          <Explain formula="R/B = (Objetivo − Entrada) / (Entrada − Stop)">
            Cuánto puedes ganar por cada peso que arriesgas. Con 1:2, aunque aciertes solo 4 de cada 10 operaciones, puedes terminar
            ganando.
          </Explain>
        </Panel>

        <Panel title="3. Esperanza matemática">
          <div className="grid grid-cols-3 gap-3">
            <NumberInput id="es-aciertos" label="Aciertos" suffix="%" value={winRate} onChange={setWinRate} />
            <NumberInput id="es-ganancia" label="Ganancia prom." value={avgWin} onChange={setAvgWin} />
            <NumberInput id="es-perdida" label="Pérdida prom." value={avgLoss} onChange={setAvgLoss} />
          </div>
          <dl>
            <Result label="Por operación" value={Number.isFinite(e) ? usd(e) : "—"} strong />
          </dl>
          <Explain formula="E = (% aciertos × ganancia promedio) − (% pérdidas × pérdida promedio)">
            Lo que ganas o pierdes en promedio por operación a la larga. Si es negativa, tu método pierde dinero aunque tengas
            rachas buenas.
          </Explain>
        </Panel>

        <Panel title="4. Factor de beneficio">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput id="fb-ganancias" label="Ganancias brutas" value={gross} onChange={setGross} />
            <NumberInput id="fb-perdidas" label="Pérdidas brutas" value={grossLoss} onChange={setGrossLoss} />
          </div>
          <dl>
            <Result label="Factor" value={decimal(pf)} strong />
          </dl>
          <Explain formula="Factor = Ganancias brutas / Pérdidas brutas">
            Arriba de 1 ganas más de lo que pierdes. Un factor de 1.5 significa $1.50 ganados por cada $1 perdido.
          </Explain>
        </Panel>

        <Panel title="5. Drawdown máximo">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput id="dd-pico" label="Pico" suffix="USD" value={peak} onChange={setPeak} />
            <NumberInput id="dd-valle" label="Valle" suffix="USD" value={trough} onChange={setTrough} />
          </div>
          <dl>
            <Result label="Caída" value={drawdown === null ? "—" : formatPercent(drawdown, 1, "auto")} strong />
            <Result label="Para recuperarte necesitas ganar" value={recovery === null ? "—" : formatPercent(recovery, 1, "auto")} />
          </dl>
          <Explain formula="Drawdown = (Pico − Valle) / Pico">
            La mayor caída de tu capital desde un máximo. Ojo: después de perder 20% necesitas ganar 25% para volver al pico.
          </Explain>
        </Panel>

        <Panel title="6. Regla de riesgo y límites de pérdida">
          <div className="grid grid-cols-3 gap-3">
            <NumberInput id="rr-capital" label="Capital" suffix="USD" value={ruleCapital} onChange={setRuleCapital} />
            <NumberInput id="rr-dia" label="Límite día" suffix="%" value={daily} onChange={setDaily} />
            <NumberInput id="rr-semana" label="Límite semana" suffix="%" value={weekly} onChange={setWeekly} />
          </div>
          <dl>
            <Result label="Máximo por operación (1%)" value={usd(riskAmount(num(ruleCapital), 1))} />
            <Result label="Máximo por operación (2%)" value={usd(riskAmount(num(ruleCapital), 2))} />
            <Result label="Pérdida máxima del día" value={usd(riskAmount(num(ruleCapital), num(daily)))} />
            <Result label="Pérdida máxima de la semana" value={usd(riskAmount(num(ruleCapital), num(weekly)))} />
          </dl>
          <Explain formula="Riesgo por operación = Capital × (1% a 2%)">
            No arriesgues más de 1–2% de tu capital de trading en una operación. Si llegas a tu límite del día o de la semana, el
            Simulador no te deja abrir más operaciones hasta el día (o la semana) siguiente: así se evita operar por revancha.
          </Explain>
        </Panel>
      </div>
      <EducationalNotice />
    </>
  );
}
