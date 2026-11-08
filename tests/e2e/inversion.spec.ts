import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

// Precios y series de prueba (inventados solo para la prueba).
test.use({ serviceWorkers: "block" });

const now = Math.floor(Date.now() / 1000);
const DAY = 86_400;

const market = {
  version: 1,
  generadoEn: new Date().toISOString(),
  errores: [],
  activos: {
    voo: { precio: 600, cierreAnterior: 598, hora: new Date().toISOString(), moneda: "USD", retrasoMin: null, fuente: "Yahoo Finance", mini: [], estado: "ok" },
    usdmxn: { precio: 19, cierreAnterior: 19.1, hora: new Date().toISOString(), moneda: "MXN", retrasoMin: null, fuente: "Yahoo Finance", mini: [], estado: "ok" },
  },
};

/** Serie que sube de 100 a ~300 en 1,000 semanas (para el simulador). */
const series = {
  id: "sp500tr",
  actualizado: new Date().toISOString(),
  fuente: "Yahoo Finance",
  diario: [],
  semanal: Array.from({ length: 1000 }, (_, i) => {
    const close = 100 + i * 0.2;
    return [now - (1000 - i) * 7 * DAY, close, close, close, close, 0];
  }),
};

async function serveData(page: Page) {
  await page.route("**/Boveda-/datos/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/mercados.json")) return route.fulfill({ json: market });
    if (path.endsWith("/series/sp500tr.json")) return route.fulfill({ json: series });
    return route.fulfill({ status: 404, body: "" });
  });
}

async function openInvesting(page: Page) {
  await page.getByRole("link", { name: /^Inversión$/ }).first().click();
  await expect(page.getByRole("heading", { name: "Inversión", level: 1 })).toBeVisible();
}

test("portafolio: registra una compra y separa mercado y tipo de cambio", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await openInvesting(page);
  await page.getByRole("button", { name: "Registrar compra" }).click();
  const sheet = page.getByRole("dialog", { name: "Registrar compra" });
  await sheet.getByLabel("Fecha").fill("2026-01-15");
  await sheet.getByLabel("Títulos").fill("2");
  await sheet.getByLabel("Precio por título (USD)").fill("500");
  await sheet.getByLabel("Tipo de cambio (pesos por dólar)").fill("18");
  await sheet.getByRole("button", { name: "Guardar compra" }).click();
  await expect(sheet).toBeHidden();

  // 2 × 600 × 19 = $22,800; aportado 2 × 500 × 18 = $18,000.
  // Mercado: 2 × 100 × 18 = $3,600; tipo de cambio: 2 × 600 × 1 = $1,200.
  await expect(page.getByText("$22,800.00").first()).toBeVisible();
  await expect(page.getByText("Por el precio de los ETFs")).toBeVisible();
  await expect(page.getByText("+$3,600.00")).toBeVisible();
  await expect(page.getByText("+$1,200.00")).toBeVisible();

  await page.getByRole("link", { name: /Mando|Centro de mando/ }).first().click();
  await expect(page.getByRole("region", { name: "Portafolio S&P 500" })).toContainText("$22,800.00");
});

test("calculadoras: interés compuesto y aportación necesaria", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await openInvesting(page);
  await page.getByRole("navigation", { name: "Inversión" }).getByRole("link", { name: "Calculadoras" }).click();
  const compound = page.getByRole("region", { name: "1. Interés compuesto con aportaciones" });
  await compound.getByLabel("Capital inicial ($)").fill("10000");
  await compound.getByLabel("Aportación mensual ($)").fill("0");
  await compound.getByLabel("Rendimiento anual (%)").fill("8");
  await compound.getByLabel("Años").fill("1");
  // $10,000 al 8% por un año = $10,800.
  await expect(compound).toContainText("$10,800.00");
  await expect(page.getByRole("region", { name: "6. Regla del 72" })).toContainText("9.0");
});

test("simulador histórico con datos de la serie", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await openInvesting(page);
  await page.getByRole("navigation", { name: "Inversión" }).getByRole("link", { name: "Simulador" }).click();
  await expect(page.getByText("Aportaste")).toBeVisible();
  await expect(page.getByText("Rendimiento anual (XIRR)")).toBeVisible();
  await page.getByRole("navigation", { name: "Inversión" }).getByRole("link", { name: "Guía" }).click();
  await expect(page.getByRole("region", { name: "Impuestos en México" })).toContainText("artículo 129");
  await page.getByLabel("Buscar en el glosario").fill("xirr");
  await expect(page.getByRole("region", { name: "Glosario" })).toContainText("considerando la fecha");
});
