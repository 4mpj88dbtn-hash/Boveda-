"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { LineChart } from "@/components/ui/line-chart";
import { EducationalNotice, EmptyState } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatDate, formatMonth, shiftMonth, todayInCancun } from "@/lib/dates";
import { formatMoney, formatPercent, parseAmountToCents } from "@/lib/money";
import { useSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { dividendSchema, purchaseSchema } from "@/modules/finance/types";
import { assetById } from "@/modules/markets/catalog";
import { fetchSeries, useMarketFile } from "@/modules/markets/data";
import { deleteDividend, deletePurchase, PORTFOLIO_ASSETS, putDividend, putPurchase, useDividends, usePurchases } from "./data";
import {
  contributedVsValue,
  dividendTotals,
  monthlyStreak,
  portfolioXirr,
  positions,
  purchaseCost,
  type Dividend,
  type Purchase,
} from "./lib/portfolio";

type Editing = { kind: "compra"; purchase: Purchase | null } | { kind: "dividendo"; dividend: Dividend | null };

/** Tu inversión en el S&P 500: lo aportado, lo que vale hoy y de dónde viene la ganancia. */
export function PortfolioView() {
  const purchases = usePurchases();
  const dividends = useDividends();
  const market = useMarketFile();
  const savedRate = useSetting("usdMxnRate");
  const [editing, setEditing] = useState<Editing | null>(null);

  if (!purchases || !dividends || !savedRate) return null;

  const today = todayInCancun();
  const quotes = market.data?.activos ?? {};
  const fxQuote = quotes.usdmxn;
  const currentFx = fxQuote ? fxQuote.precio.toFixed(4) : (savedRate.value?.rate ?? null);
  const fxNote = fxQuote
    ? `Dólar a $${fxQuote.precio.toFixed(4)} (${fxQuote.fuente}).`
    : savedRate.value
      ? `Dólar a $${savedRate.value.rate}, el que escribiste el ${formatDate(savedRate.value.date)}.`
      : "Falta el tipo de cambio de hoy.";
  const prices = Object.fromEntries(PORTFOLIO_ASSETS.map((id) => [id, quotes[id]?.precio]));
  const list = positions(purchases, prices, currentFx);
  const complete = list.every((position) => position.valueMxnCents !== null);
  const invested = list.reduce((sum, position) => sum + position.investedMxnCents, 0);
  const value = complete ? list.reduce((sum, position) => sum + (position.valueMxnCents ?? 0), 0) : null;
  const valueUsd = complete ? list.reduce((sum, position) => sum + (position.valueUsdCents ?? 0), 0) : null;
  const market$ = list.reduce((sum, position) => sum + (position.marketEffectMxnCents ?? 0), 0);
  const fx$ = list.reduce((sum, position) => sum + (position.fxEffectMxnCents ?? 0), 0);
  const commissions = list.reduce((sum, position) => sum + position.commissionsMxnCents, 0);
  const divs = dividendTotals(dividends);
  const xirrValue = value === null ? null : portfolioXirr(purchases, dividends, value, today);
  const streak = monthlyStreak(purchases, today);

  return (
    <>
      {purchases.length === 0 ? (
        <Panel>
          <EmptyState
            title="Registra tu primera compra"
            description="Fecha, ETF, títulos (acepta fracciones), precio en dólares, comisión y el tipo de cambio de ese día. Con eso calculamos tu costo promedio, tu rendimiento y cuánto viene del mercado y cuánto del dólar."
            action={
              <Button className="mt-2" onClick={() => setEditing({ kind: "compra", purchase: null })}>
                <Plus aria-hidden className="size-5" />
                Registrar compra
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel>
            <div className="flex flex-col gap-1">
              <h2 className="font-sans text-etiqueta font-medium text-texto-2">Vale hoy</h2>
              <p className="font-serif text-display font-semibold lg:text-display-lg">
                {value === null ? <span className="text-texto-2">Sin precio de hoy</span> : <Amount cents={value} />}
              </p>
              {valueUsd !== null ? (
                <p className="cifras text-interfaz text-texto-2">{formatMoney(valueUsd, "USD")}</p>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Aportado" value={<Amount cents={invested} />} />
              <Stat label="Ganancia" value={value === null ? "—" : <Amount cents={value - invested} tone="variacion" />} />
              <Stat label="Rendimiento" value={value === null || invested === 0 ? "—" : formatPercent((value - invested) / invested, 2)} />
              <Stat label="Anual (XIRR)" value={xirrValue === null ? "—" : formatPercent(xirrValue, 2)} />
            </dl>
            {value !== null ? (
              <dl className="flex flex-col divide-y divide-borde text-interfaz">
                <Row label="Por el precio de los ETFs" value={<Amount cents={market$} tone="variacion" />} />
                <Row label="Por el tipo de cambio" value={<Amount cents={fx$} tone="variacion" />} />
                <Row label="Comisiones" value={<Amount cents={-commissions} tone="variacion" />} />
                <Row label="Dividendos recibidos" value={<Amount cents={divs.mxnCents} />} />
              </dl>
            ) : null}
            <p className="text-etiqueta text-texto-2">
              {streak > 0 ? `Constancia: ${streak} ${streak === 1 ? "mes" : "meses"} seguidos invirtiendo. ` : ""}
              {fxNote} El XIRR aparece después de un mes de historia.
            </p>
          </Panel>

          <ContributedChart purchases={purchases} />

          <Panel title="Por ETF">
            <ul className="flex flex-col divide-y divide-borde">
              {list.map((position) => (
                <li key={position.assetId} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-interfaz font-medium">{assetById(position.assetId)?.nombre ?? position.assetId}</span>
                    {position.valueMxnCents !== null ? <Amount cents={position.valueMxnCents} className="text-interfaz" /> : null}
                  </span>
                  <span className="cifras text-etiqueta text-texto-2">
                    {Number(position.shares).toLocaleString("es-MX", { maximumFractionDigits: 6 })} títulos · costo promedio USD{" "}
                    {position.averageCostUsd.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {prices[position.assetId] !== undefined ? ` · hoy USD ${prices[position.assetId]?.toFixed(2)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <Panel
        title="Movimientos"
        action={
          <span className="flex gap-1">
            <Button variant="fantasma" onClick={() => setEditing({ kind: "compra", purchase: null })}>
              <Plus aria-hidden className="size-5" />
              Compra
            </Button>
            <Button variant="fantasma" onClick={() => setEditing({ kind: "dividendo", dividend: null })}>
              <Plus aria-hidden className="size-5" />
              Dividendo
            </Button>
          </span>
        }
      >
        {purchases.length === 0 && dividends.length === 0 ? (
          <p className="text-interfaz text-texto-2">Aquí aparecen tus compras y dividendos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {[
              ...purchases.map((purchase) => ({ kind: "compra" as const, date: purchase.date, item: purchase })),
              ...dividends.map((dividend) => ({ kind: "dividendo" as const, date: dividend.date, item: dividend })),
            ]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <li key={entry.item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing(
                        entry.kind === "compra"
                          ? { kind: "compra", purchase: entry.item as Purchase }
                          : { kind: "dividendo", dividend: entry.item as Dividend },
                      )
                    }
                    className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-interfaz">
                        {entry.kind === "compra" ? "Compra" : "Dividendo"} · {assetById(entry.item.assetId)?.nombre ?? entry.item.assetId}
                      </span>
                      <span className="text-etiqueta text-texto-2">
                        {formatDate(entry.date)}
                        {entry.kind === "compra" ? ` · ${(entry.item as Purchase).shares} títulos a USD ${(entry.item as Purchase).priceUsd}` : ""}
                      </span>
                    </span>
                    <Amount
                      cents={entry.kind === "compra" ? purchaseCost(entry.item as Purchase).mxnCents : (entry.item as Dividend).amountUsdCents}
                      currency={entry.kind === "compra" ? "MXN" : "USD"}
                      className="text-interfaz"
                    />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <EducationalNotice />

      {editing?.kind === "compra" ? (
        <PurchaseSheet purchase={editing.purchase} suggestedFx={currentFx} onClose={() => setEditing(null)} />
      ) : null}
      {editing?.kind === "dividendo" ? (
        <DividendSheet dividend={editing.dividend} suggestedFx={currentFx} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-etiqueta text-texto-2">{label}</dt>
      <dd className="cifras font-serif text-cifra font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-texto-2">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Lo aportado contra lo que valía al cierre de cada mes (series publicadas de cada ETF y del dólar). */
function ContributedChart({ purchases }: { purchases: Purchase[] }) {
  const [series, setSeries] = useState<Record<string, [number, number][]> | null>(null);
  const assets = useMemo(() => [...new Set(purchases.map((purchase) => purchase.assetId))].sort().join(","), [purchases]);

  useEffect(() => {
    let cancelled = false;
    const ids = [...assets.split(","), "usdmxn"].filter(Boolean);
    void Promise.all(ids.map((id) => fetchSeries(id))).then((files) => {
      if (cancelled) return;
      const result: Record<string, [number, number][]> = {};
      files.forEach((file, index) => {
        const id = ids[index];
        if (file && id) result[id] = file.diario.map((candle) => [candle[0], candle[4]]);
      });
      setSeries(result);
    });
    return () => {
      cancelled = true;
    };
  }, [assets]);

  const first = purchases.map((purchase) => purchase.date).sort()[0];
  if (!first || !series) return null;
  const months: string[] = [];
  for (let month = first.slice(0, 7); month <= todayInCancun().slice(0, 7); month = shiftMonth(month, 1)) months.push(month);
  if (months.length < 2) return null;
  const points = contributedVsValue(purchases, series, series.usdmxn ?? [], months.slice(-36));
  const label = (month: string) => formatMonth(month).replace(/ de (\d{4})$/, " $1").slice(0, 3) + " " + month.slice(2, 4);

  return (
    <Panel title="Aportado contra lo que vale">
      <LineChart
        ariaLabel="Lo aportado y lo que valía tu portafolio al cierre de cada mes"
        labels={points.map((point) => label(point.month))}
        format={(cents) => formatMoney(Math.round(cents), "MXN").replace(/\.\d{2}$/, "")}
        series={[
          { label: "Aportado", color: "texto-2", dashed: true, values: points.map((point) => point.contributedMxnCents) },
          { label: "Valor al cierre del mes", color: "laton", values: points.map((point) => point.valueMxnCents) },
        ]}
      />
      <p className="text-nota text-texto-2">En pesos, con el cierre de cada ETF y el tipo de cambio de ese día (Yahoo Finance).</p>
    </Panel>
  );
}

function PurchaseSheet({ purchase, suggestedFx, onClose }: { purchase: Purchase | null; suggestedFx: string | null; onClose: () => void }) {
  const [date, setDate] = useState(purchase?.date ?? todayInCancun());
  const [assetId, setAssetId] = useState(purchase?.assetId ?? "voo");
  const [shares, setShares] = useState(purchase?.shares ?? "");
  const [price, setPrice] = useState(purchase?.priceUsd ?? "");
  const [fx, setFx] = useState(purchase?.fxRate ?? suggestedFx ?? "");
  const [commission, setCommission] = useState(purchase ? (purchase.commissionCents / 100).toFixed(2) : "");
  const [commissionCurrency, setCommissionCurrency] = useState<"MXN" | "USD">(purchase?.commissionCurrency ?? "MXN");
  const [note, setNote] = useState(purchase?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const commissionCents = commission.trim() === "" ? { ok: true as const, cents: 0 } : parseAmountToCents(commission);
    if (!commissionCents.ok) return setError(commissionCents.error);
    const parsed = purchaseSchema.safeParse({
      id: purchase?.id ?? crypto.randomUUID(),
      date,
      assetId,
      shares: shares.trim().replace(",", "."),
      priceUsd: price.trim().replace(",", "."),
      fxRate: fx.trim().replace(",", "."),
      commissionCents: commissionCents.cents,
      commissionCurrency,
      note: note.trim(),
      createdAt: purchase?.createdAt ?? Date.now(),
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return setError(
        field === "shares"
          ? "Escribe los títulos con punto decimal, por ejemplo 0.5123."
          : field === "priceUsd"
            ? "Escribe el precio por título en dólares, por ejemplo 612.35."
            : field === "fxRate"
              ? "Escribe el tipo de cambio: cuántos pesos vale 1 dólar."
              : "Revisa la fecha y los datos.",
      );
    }
    if (Number(parsed.data.shares) <= 0 || Number(parsed.data.priceUsd) <= 0) return setError("Títulos y precio deben ser mayores a cero.");
    await putPurchase(parsed.data);
    onClose();
    showToast({ message: purchase ? "Compra actualizada" : `Compra registrada: ${formatMoney(purchaseCost(parsed.data).mxnCents, "MXN")}` });
  }

  async function remove() {
    if (!purchase) return;
    await deletePurchase(purchase.id);
    onClose();
    showToast({ message: "Compra eliminada", action: { label: "Deshacer", run: () => putPurchase(purchase) } });
  }

  return (
    <Sheet
      title={purchase ? "Editar compra" : "Registrar compra"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar compra
          </Button>
          {purchase ? (
            <Button variant="fantasma" className="w-full text-negativo-texto" onClick={() => void remove()}>
              Eliminar compra
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
        <div className="grid grid-cols-2 gap-3">
          <Field id="compra-fecha" label="Fecha">
            <Input id="compra-fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field id="compra-etf" label="ETF">
            <Select id="compra-etf" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
              {PORTFOLIO_ASSETS.map((id) => (
                <option key={id} value={id}>
                  {id.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="compra-titulos" label="Títulos">
            <Input id="compra-titulos" inputMode="decimal" autoComplete="off" placeholder="0.5123" value={shares} onChange={(event) => setShares(event.target.value)} />
          </Field>
          <Field id="compra-precio" label="Precio por título (USD)">
            <Input id="compra-precio" inputMode="decimal" autoComplete="off" placeholder="612.35" value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <Field id="compra-tc" label="Tipo de cambio (pesos por dólar)">
            <Input id="compra-tc" inputMode="decimal" autoComplete="off" placeholder="18.45" value={fx} onChange={(event) => setFx(event.target.value)} />
          </Field>
          <Field id="compra-comision" label={`Comisión (${commissionCurrency})`}>
            <Input id="compra-comision" inputMode="decimal" autoComplete="off" placeholder="0.00" value={commission} onChange={(event) => setCommission(event.target.value)} />
          </Field>
        </div>
        <div role="group" aria-label="Moneda de la comisión" className="flex gap-2">
          {(["MXN", "USD"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={commissionCurrency === option}
              onClick={() => setCommissionCurrency(option)}
              className={cn(
                "h-11 rounded-full border px-4 text-etiqueta",
                commissionCurrency === option ? "border-laton text-texto" : "border-borde-control text-texto-2",
              )}
            >
              Comisión en {option}
            </button>
          ))}
        </div>
        <Field id="compra-nota" label="Nota (opcional)">
          <Input id="compra-nota" maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <p className="text-nota text-texto-2">
          El tipo de cambio sugerido es el de hoy; si compraste otro día, escribe el que te aplicó tu casa de bolsa.
        </p>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function DividendSheet({ dividend, suggestedFx, onClose }: { dividend: Dividend | null; suggestedFx: string | null; onClose: () => void }) {
  const [date, setDate] = useState(dividend?.date ?? todayInCancun());
  const [assetId, setAssetId] = useState(dividend?.assetId ?? "voo");
  const [amount, setAmount] = useState(dividend ? (dividend.amountUsdCents / 100).toFixed(2) : "");
  const [fx, setFx] = useState(dividend?.fxRate ?? suggestedFx ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cents = parseAmountToCents(amount);
    if (!cents.ok) return setError(cents.error);
    const parsed = dividendSchema.safeParse({
      id: dividend?.id ?? crypto.randomUUID(),
      date,
      assetId,
      amountUsdCents: cents.cents,
      fxRate: fx.trim().replace(",", "."),
      note: "",
      createdAt: dividend?.createdAt ?? Date.now(),
    });
    if (!parsed.success) return setError("Revisa el monto y el tipo de cambio.");
    await putDividend(parsed.data);
    onClose();
    showToast({ message: "Dividendo guardado" });
  }

  async function remove() {
    if (!dividend) return;
    await deleteDividend(dividend.id);
    onClose();
    showToast({ message: "Dividendo eliminado", action: { label: "Deshacer", run: () => putDividend(dividend) } });
  }

  return (
    <Sheet
      title={dividend ? "Editar dividendo" : "Registrar dividendo"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button size="lg" className="w-full" onClick={() => void save()}>
            Guardar dividendo
          </Button>
          {dividend ? (
            <Button variant="fantasma" className="w-full text-negativo-texto" onClick={() => void remove()}>
              Eliminar dividendo
            </Button>
          ) : null}
        </div>
      }
    >
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field id="dividendo-fecha" label="Fecha">
          <Input id="dividendo-fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field id="dividendo-etf" label="ETF">
          <Select id="dividendo-etf" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            {PORTFOLIO_ASSETS.map((id) => (
              <option key={id} value={id}>
                {id.toUpperCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="dividendo-monto" label="Lo que te depositaron (USD)">
          <Input id="dividendo-monto" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field id="dividendo-tc" label="Tipo de cambio">
          <Input id="dividendo-tc" inputMode="decimal" autoComplete="off" value={fx} onChange={(event) => setFx(event.target.value)} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
