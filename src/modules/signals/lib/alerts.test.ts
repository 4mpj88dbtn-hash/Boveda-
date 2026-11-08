import { describe, expect, it } from "vitest";
// La tarea de GitHub lee la configuración con esta función: la prueba asegura que se entienden.
import { leerConfig } from "../../../../scripts/senales/senales.mjs";
import { checkAlerts, DEFAULT_TELEGRAM_CONFIG, telegramConfigText, type PriceAlert } from "./alerts";

const quote = (precio: number) => ({
  precio,
  cierreAnterior: null,
  hora: null,
  moneda: null,
  retrasoMin: null,
  fuente: "Yahoo Finance",
  mini: [],
  estado: "ok" as const,
});

const alerts: PriceAlert[] = [
  { id: "1", assetId: "voo", condition: "menor", value: 450, createdAt: 0 },
  { id: "2", assetId: "btc", condition: "mayor", value: 120_000, createdAt: 0 },
  { id: "3", assetId: "aapl", condition: "mayor", value: 1, createdAt: 0 },
];

describe("checkAlerts", () => {
  it("marca las que se cumplen y omite las que no tienen precio", () => {
    const result = checkAlerts(alerts, { voo: quote(449.5), btc: quote(101_000) });
    expect(result.map((item) => [item.alert.id, item.triggered])).toEqual([
      ["1", true],
      ["2", false],
    ]);
  });
});

describe("telegramConfigText", () => {
  it("genera una configuración que la tarea de GitHub entiende igual", () => {
    const text = telegramConfigText({ ...DEFAULT_TELEGRAM_CONFIG, cierre: false, aportacionDia: 5 }, alerts.slice(0, 1));
    const read = leerConfig(text);
    expect(read).toMatchObject({ cierre: false, aportacionDia: 5, alertasPrecio: [{ id: "voo", condicion: "menor", valor: 450 }] });
  });

  it("sin alertas del dispositivo no incluye ninguna", () => {
    expect(JSON.parse(telegramConfigText(DEFAULT_TELEGRAM_CONFIG, null)).alertasPrecio).toEqual([]);
  });
});
