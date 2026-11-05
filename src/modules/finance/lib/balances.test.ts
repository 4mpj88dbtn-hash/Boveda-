import { describe, expect, it } from "vitest";
import { accountBalances, amountInMxn, netWorth } from "./balances";
import { account, movement } from "./test-data";

/*
 * Caso verificado a mano (centavos):
 *   Banco MXN      2,000,000  +1,500,000 (honorarios) −500,000 (pago de tarjeta) −185,000 (al broker) = 2,815,000
 *   Efectivo MXN     100,000  −25,000 (comida) −36,500 (USD 20.00 × 18.25)                            =    38,500
 *   Tarjeta MXN     −500,000  −120,000 (súper) +500,000 (pago)                                         =  −120,000
 *   Broker USD        10,000  +10,000 (185,000 ÷ 18.50 = USD 100.00)                                   =    20,000
 * Patrimonio con 18.40: 2,815,000 + 38,500 − 120,000 + (20,000 × 18.40 = 368,000) = 3,101,500 → $31,015.00
 */
const accounts = [
  account({ id: "banco", openingBalanceCents: 2_000_000 }),
  account({ id: "efectivo", kind: "efectivo", openingBalanceCents: 100_000 }),
  account({ id: "tarjeta", kind: "tarjeta", openingBalanceCents: -500_000 }),
  account({ id: "broker", kind: "inversion", currency: "USD", openingBalanceCents: 10_000 }),
];

const transactions = [
  movement({ type: "ingreso", amountCents: 1_500_000, accountId: "banco", categoryId: "ingreso-honorarios" }),
  movement({ type: "gasto", amountCents: 25_000, accountId: "efectivo" }),
  movement({ type: "gasto", amountCents: 120_000, accountId: "tarjeta", categoryId: "gasto-super" }),
  movement({ type: "transferencia", amountCents: 500_000, accountId: "banco", toAccountId: "tarjeta" }),
  movement({ type: "transferencia", amountCents: 185_000, accountId: "banco", toAccountId: "broker", fxRate: "18.50" }),
  movement({ type: "gasto", amountCents: 2_000, currency: "USD", fxRate: "18.25", accountId: "efectivo" }),
];

describe("accountBalances", () => {
  it("suma ingresos, resta gastos y mueve transferencias entre monedas", () => {
    const balances = accountBalances(accounts, transactions);
    expect(Object.fromEntries(balances)).toEqual({
      banco: 2_815_000,
      efectivo: 38_500,
      tarjeta: -120_000,
      broker: 20_000,
    });
  });

  it("ignora movimientos de cuentas que ya no están", () => {
    const balances = accountBalances(accounts, [movement({ type: "gasto", amountCents: 100, accountId: "otra" })]);
    expect(balances.get("banco")).toBe(2_000_000);
  });
});

describe("netWorth", () => {
  const balances = accountBalances(accounts, transactions);

  it("suma todo en pesos con el tipo de cambio guardado", () => {
    expect(netWorth(accounts, balances, "18.40")).toEqual({
      totalCents: 3_101_500,
      assetsCents: 3_221_500,
      liabilitiesCents: 120_000,
      missingRate: false,
    });
  });

  it("sin tipo de cambio deja fuera las cuentas en USD y lo avisa", () => {
    expect(netWorth(accounts, balances, null)).toEqual({
      totalCents: 2_733_500,
      assetsCents: 2_853_500,
      liabilitiesCents: 120_000,
      missingRate: true,
    });
  });
});

describe("amountInMxn", () => {
  it("convierte dólares con el tipo de cambio del movimiento y redondea mitades hacia arriba", () => {
    // USD 0.03 × 18.50 = 55.5 centavos → 56.
    expect(amountInMxn({ amountCents: 3, currency: "USD", fxRate: "18.50" })).toBe(56);
    expect(amountInMxn({ amountCents: 12_345, currency: "MXN", fxRate: null })).toBe(12_345);
  });

  it("no inventa un tipo de cambio si falta", () => {
    expect(() => amountInMxn({ amountCents: 100, currency: "USD", fxRate: null })).toThrow(RangeError);
  });
});
