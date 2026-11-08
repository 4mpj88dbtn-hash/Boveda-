"use client";

import { useState, type ReactNode } from "react";
import { Field, Input } from "@/components/ui/field";
import { EducationalNotice } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { formatMoney } from "@/lib/money";
import { assetById } from "@/modules/markets/catalog";
import { useMarketFile } from "@/modules/markets/data";
import { formatQuote } from "@/modules/markets/lib/format";
import { formatDataTime } from "@/modules/markets/market-ui";

const REVIEWED = "08/11/2026";

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-laton underline underline-offset-4">
      {children}
    </a>
  );
}

const ETFS = [
  { ticker: "VOO", issuer: "Vanguard", fee: "0.03%", note: "Comisión baja; muy usado para largo plazo." },
  { ticker: "IVV", issuer: "BlackRock (iShares)", fee: "0.03%", note: "Igual de barato que VOO." },
  { ticker: "SPY", issuer: "State Street (SPDR)", fee: "0.0945%", note: "El más antiguo y el que más se opera; útil para traders." },
];

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Acción", meaning: "Una parte pequeña de una empresa. Si a la empresa le va bien, tu parte suele valer más." },
  { term: "Bono del Tesoro a 10 años", meaning: "Deuda del gobierno de EE. UU. a 10 años. Su tasa es una referencia para todo el mercado." },
  { term: "Bróker o casa de bolsa", meaning: "La empresa que compra y vende por ti en la bolsa y guarda tus títulos." },
  { term: "CAGR", meaning: "Crecimiento anual compuesto: la tasa pareja que explica cómo pasó algo de un valor a otro en varios años." },
  { term: "CAPE de Shiller", meaning: "Precio del S&P 500 dividido entre las utilidades promedio de 10 años, ajustadas por inflación. Sirve para ver si el mercado está caro o barato en la historia." },
  { term: "Capitalización de mercado", meaning: "Lo que vale una empresa en bolsa: precio de la acción por número de acciones." },
  { term: "Comisión anual (expense ratio)", meaning: "Lo que cobra un ETF cada año sobre lo que tienes invertido, ya descontado del precio." },
  { term: "Constancia fiscal", meaning: "Documento anual de tu casa de bolsa con tus ganancias, pérdidas y dividendos, para tu declaración." },
  { term: "DCA (inversión periódica)", meaning: "Invertir la misma cantidad cada cierto tiempo, sin importar el precio. Reduce el riesgo de entrar todo en mal momento." },
  { term: "Diversificación", meaning: "No poner todo en una sola cosa. El S&P 500 ya reparte tu dinero entre 500 empresas." },
  { term: "Dividendo", meaning: "Parte de las ganancias que una empresa reparte a sus accionistas." },
  { term: "ETF", meaning: "Un fondo que se compra y vende en bolsa como una acción y que replica un índice, como el S&P 500." },
  { term: "Fondo de emergencia", meaning: "Dinero disponible para imprevistos, de 3 a 6 meses de tus gastos esenciales. Va antes de invertir." },
  { term: "Horizonte de inversión", meaning: "Cuánto tiempo puedes dejar invertido el dinero. Para acciones, mejor 5 años o más." },
  { term: "Índice", meaning: "Una canasta de empresas que mide cómo va un mercado. El S&P 500 sigue a 500 empresas grandes de EE. UU." },
  { term: "Inflación", meaning: "Cuánto suben los precios en general. Reduce lo que puedes comprar con el mismo dinero." },
  { term: "Interés compuesto", meaning: "Ganar rendimientos sobre tus rendimientos anteriores. Es lo que hace crecer mucho una inversión con el tiempo." },
  { term: "Liquidez", meaning: "Qué tan fácil es vender algo rápido sin perder precio." },
  { term: "Orden limitada", meaning: "Compra o venta solo a un precio que tú fijas o mejor." },
  { term: "Orden de mercado", meaning: "Compra o venta inmediata al mejor precio disponible en ese momento." },
  { term: "P/E (precio / utilidad)", meaning: "Cuántas veces sus utilidades anuales cuesta una acción o un índice. Más alto suele significar más caro." },
  { term: "Rebalancear", meaning: "Volver a la mezcla que elegiste (por ejemplo, 80% acciones y 20% bonos) cuando el mercado la mueve." },
  { term: "Rendimiento real", meaning: "Lo que ganas después de descontar la inflación." },
  { term: "Riesgo cambiario", meaning: "Que el tipo de cambio mueva tu rendimiento en pesos: si el peso se fortalece, tus dólares valen menos pesos." },
  { term: "SIC", meaning: "Sistema Internacional de Cotizaciones: permite comprar en la Bolsa Mexicana valores extranjeros, como VOO o IVV, en pesos." },
  { term: "Spread", meaning: "La diferencia entre el precio al que puedes comprar y al que puedes vender en ese momento." },
  { term: "Tasa de la Fed", meaning: "La tasa de interés de referencia de EE. UU. Mueve el costo del dinero en todo el mundo." },
  { term: "Tasa objetivo de Banxico", meaning: "La tasa de interés de referencia en México." },
  { term: "VIX", meaning: "El índice del miedo: mide cuánta volatilidad espera el mercado en los próximos 30 días." },
  { term: "Volatilidad", meaning: "Qué tanto sube y baja un precio. Más volatilidad, más sustos en el camino." },
  { term: "W-8BEN", meaning: "Formato de EE. UU. con el que declaras que no eres residente fiscal allá; afecta la retención a tus dividendos." },
  { term: "XIRR", meaning: "Rendimiento anual de tu inversión considerando la fecha de cada aportación." },
];

/** Guía para principiantes (§4.3): tarjetas cortas, impuestos citados y glosario. */
export function GuideView() {
  const market = useMarketFile();
  const [query, setQuery] = useState("");
  const [gain, setGain] = useState("20000");
  const [taxRate, setTaxRate] = useState("10");
  const normalized = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const terms = GLOSSARY.filter((item) =>
    `${item.term} ${item.meaning}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(normalized),
  );
  const gainValue = Number(gain.replace(/,/g, ""));
  const rateValue = Number(taxRate) / 100;
  const quotes = market.data?.activos ?? {};

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Panel title="¿Qué es el S&P 500?">
          <p className="text-interfaz">
            Un índice con 500 de las empresas más grandes de EE. UU. (Apple, Microsoft, NVIDIA…). Cada una pesa según su tamaño en
            bolsa. Invertir en él es comprar un poco de todas a la vez: si a la economía de EE. UU. le va bien a largo plazo, al
            índice también. Por eso se usa para el largo plazo.
          </p>
        </Panel>

        <Panel title="ETFs: VOO, IVV y SPY">
          <p className="text-interfaz">Los tres siguen al mismo índice. La diferencia principal es la comisión anual.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[340px] text-etiqueta">
              <thead>
                <tr className="text-left text-texto-2">
                  <th className="py-1.5 font-medium">ETF</th>
                  <th className="py-1.5 font-medium">Emisor</th>
                  <th className="py-1.5 text-right font-medium">Comisión anual</th>
                </tr>
              </thead>
              <tbody>
                {ETFS.map((etf) => (
                  <tr key={etf.ticker} className="border-t border-borde align-top">
                    <td className="py-1.5 font-medium">{etf.ticker}</td>
                    <td className="py-1.5">
                      {etf.issuer}
                      <span className="block text-nota text-texto-2">{etf.note}</span>
                    </td>
                    <td className="cifras py-1.5 text-right">{etf.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-nota text-texto-2">
            Comisiones revisadas el {REVIEWED} en <Source href="https://www.etf.com/sections/news/voo-vs-spy-vs-ivv-which-sp-500-etf-should-you-buy-2026">etf.com</Source> y{" "}
            <Source href="https://www.nerdwallet.com/investing/learn/spy-etf">NerdWallet</Source>. Confírmalas en la página de cada
            emisor antes de comprar.
          </p>
        </Panel>

        <Panel title="Cómo invertir desde México">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-interfaz">
            <li>
              <span className="font-medium">Casa de bolsa mexicana con acceso al SIC:</span> compras VOO, IVV o SPY en pesos dentro de
              la Bolsa Mexicana y te dan tu constancia fiscal anual.
            </li>
            <li>
              <span className="font-medium">Bróker internacional:</span> abres cuenta en otro país y llenas el W-8BEN. El tratamiento
              fiscal puede ser distinto.
            </li>
            <li>
              <span className="font-medium">Qué comparar:</span> comisión por operación y por custodia, monto mínimo, si permite
              títulos fraccionados, quién lo regula (en México, la CNBV) y cómo protege tu cuenta y dónde guarda tus títulos.
            </li>
          </ul>
        </Panel>

        <Panel title="Invertir cada mes (DCA)">
          <p className="text-interfaz">
            Invertir la misma cantidad cada mes compra más títulos cuando el precio baja y menos cuando sube. No tienes que adivinar
            el mejor momento, y evitas meter todo justo antes de una caída. En Calculadoras puedes ver tu costo promedio.
          </p>
        </Panel>

        <Panel title="Reglas de oro">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-interfaz">
            <li>Primero tu fondo de emergencia (3 a 6 meses de gastos esenciales).</li>
            <li>No inviertas dinero que vas a necesitar en menos de 5 años.</li>
            <li>Piensa en años, no en días. Las caídas son parte del camino.</li>
            <li>No vendas por pánico: las peores pérdidas se fijan al vender en el fondo.</li>
            <li>Reinvierte los dividendos.</li>
            <li>Rebalancea de vez en cuando si combinas acciones y bonos.</li>
            <li>Diversifica: el S&P 500 ya lo hace por ti dentro de EE. UU.</li>
          </ol>
        </Panel>

        <Panel title="Riesgo cambiario">
          <p className="text-interfaz">
            El ETF cotiza en dólares. Si el peso se fortalece (el dólar baja), tu inversión vale menos pesos aunque el ETF haya
            subido; si el peso se debilita, vale más. En Portafolio separamos cuánto de tu ganancia viene del mercado y cuánto del
            tipo de cambio.
          </p>
        </Panel>
      </div>

      <Panel title="Impuestos en México">
        <p className="text-etiqueta text-texto-2">Revisado el {REVIEWED}. Es información general: verifica con tu contador.</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-interfaz">
          <li>
            <span className="font-medium">Ganancias por vender acciones y ETFs de índices accionarios</span> en bolsas mexicanas
            (incluido el SIC): ISR de 10% sobre la ganancia neta del año (artículo 129 de la Ley del ISR). La BMV lo clasifica como
            &ldquo;gravado al 10%, sin retención&rdquo;: se paga en tu declaración anual con la constancia de tu casa de bolsa. El
            SAT aplica la misma tasa a acciones extranjeras cotizadas en bolsas concesionadas (criterio 37/ISR/N).
          </li>
          <li>Los ETFs de bonos o de materias primas pueden no entrar en esa regla del 10%.</li>
          <li>
            <span className="font-medium">Dividendos de ETFs de EE. UU.:</span> EE. UU. retiene impuesto a los dividendos de no
            residentes. Con el W-8BEN vigente, las casas de bolsa mexicanas reportan una retención menor por el tratado
            México–EE. UU.; ese impuesto se puede acreditar en tu declaración en México. Confirma la tasa con tu casa de bolsa.
          </li>
          <li>Si inviertes con un bróker internacional fuera del SIC, el tratamiento puede ser distinto al 10%.</li>
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Field id="isr-ganancia" label="Ganancia neta del año ($)">
            <Input id="isr-ganancia" inputMode="decimal" value={gain} onChange={(event) => setGain(event.target.value)} />
          </Field>
          <Field id="isr-tasa" label="Tasa (%)">
            <Input id="isr-tasa" inputMode="decimal" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
          </Field>
        </div>
        <p className="text-interfaz">
          ISR estimado:{" "}
          <span className="cifras font-medium">
            {Number.isFinite(gainValue * rateValue) && gainValue > 0 ? formatMoney(Math.round(gainValue * rateValue * 100), "MXN") : "—"}
          </span>
        </p>
        <p className="text-nota text-texto-2">
          Fuentes: <Source href="https://wwwmat.sat.gob.mx/articulo/59621/articulo-129">SAT, artículo 129 LISR</Source> ·{" "}
          <Source href="https://www.bmv.com.mx/wb3/wb/MEX/regimen_fiscal">BMV, régimen fiscal</Source> ·{" "}
          <Source href="https://www.rankia.mx/blog/como-comenzar-invertir-bolsa/7335308-que-impuestos-pagas-vender-acciones-etfs-mexico">Rankia</Source> ·{" "}
          <Source href="https://gbm.com/faqs/como-funcionan-los-impuestos-sobre-los-dividendos-en-trading-mx">GBM, impuestos sobre dividendos</Source>.
        </p>
      </Panel>

      <Panel title="Indicadores del momento">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["bono10", "vix", "fed", "banxico", "usdmxn", "sp500"].map((id) => {
            const asset = assetById(id);
            const quote = quotes[id];
            return (
              <div key={id} className="flex flex-col gap-0.5">
                <dt className="text-etiqueta text-texto-2">{asset?.nombre}</dt>
                <dd className="cifras text-interfaz">{quote && asset ? formatQuote(quote.precio, asset.unidad) : "Sin dato"}</dd>
                <dd className="text-nota text-texto-2">
                  {quote ? `${quote.fuente} · ${quote.fechaDato ? quote.fechaDato.split("-").reverse().join("/") : quote.hora ? formatDataTime(quote.hora) : ""}` : asset?.fred || asset?.banxico ? "Necesita su clave gratuita" : ""}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="text-nota text-texto-2">
          El P/E del S&P 500 y el CAPE de Shiller no tienen una fuente gratuita confiable para la app; puedes consultarlos en{" "}
          <Source href="https://www.multpl.com/">multpl.com</Source>. La inflación de EE. UU. aparece en Calendario cuando agregas
          la clave de FRED.
        </p>
      </Panel>

      <Panel title="Glosario">
        <Input type="search" aria-label="Buscar en el glosario" placeholder="Buscar término" value={query} onChange={(event) => setQuery(event.target.value)} />
        <dl className="flex flex-col divide-y divide-borde">
          {terms.map((item) => (
            <div key={item.term} className="flex flex-col gap-0.5 py-2.5">
              <dt className="text-interfaz font-medium">{item.term}</dt>
              <dd className="text-etiqueta text-texto-2">{item.meaning}</dd>
            </div>
          ))}
        </dl>
        {terms.length === 0 ? <p className="text-interfaz text-texto-2">Sin resultados. Prueba con otra palabra.</p> : null}
      </Panel>

      <EducationalNotice />
    </>
  );
}
