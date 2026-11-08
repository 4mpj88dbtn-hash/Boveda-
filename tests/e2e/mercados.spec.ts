import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

// Los datos de mercado se sirven con archivos de prueba (inventados solo para la prueba).
test.use({ serviceWorkers: "block" });

const now = Math.floor(Date.now() / 1000);
const DAY = 86_400;

function candles(count: number, step: number, start: number, base: number) {
  return Array.from({ length: count }, (_, i) => {
    const close = base + i * 2 + (i % 5);
    return [start + i * step, close - 1, close + 2, close - 2, close, 1000 + i];
  });
}

const market = {
  version: 1,
  generadoEn: new Date().toISOString(),
  errores: [{ id: "fix", mensaje: "Falta configurar BANXICO_TOKEN" }],
  activos: {
    sp500: {
      precio: 7376.86,
      cierreAnterior: 7356.73,
      hora: new Date().toISOString(),
      moneda: "USD",
      retrasoMin: null,
      fuente: "Yahoo Finance",
      mini: [7350, 7360, 7355, 7370, 7376.86],
      estado: "ok",
    },
    btc: {
      precio: 101000.5,
      cierreAnterior: 102000,
      hora: new Date().toISOString(),
      moneda: "USD",
      retrasoMin: 0,
      fuente: "Coinbase",
      mini: [],
      estado: "ok",
    },
  },
};

async function serveMarketData(page: Page) {
  await page.route("**/Boveda-/datos/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/mercados.json")) return route.fulfill({ json: market });
    if (url.pathname.endsWith("/intradia/sp500.json")) {
      return route.fulfill({
        json: { id: "sp500", actualizado: new Date().toISOString(), unDia: candles(78, 300, now - 78 * 300, 7300), cincoDias: candles(65, 1800, now - 5 * DAY, 7200) },
      });
    }
    if (url.pathname.endsWith("/series/sp500.json")) {
      return route.fulfill({
        json: {
          id: "sp500",
          actualizado: new Date().toISOString(),
          fuente: "Yahoo Finance",
          diario: candles(400, DAY, now - 400 * DAY, 6000),
          semanal: candles(200, 7 * DAY, now - 200 * 7 * DAY, 3000),
        },
      });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}

test("Mercados: precios con fuente y hora, estado de la bolsa y claves que faltan", async ({ page }) => {
  await serveMarketData(page);
  await setUp(page);
  await expect(page.getByRole("region", { name: "Mercados" })).toContainText("7,376.86");

  await page.getByRole("link", { name: "Mercados" }).first().click();
  await expect(page.getByRole("heading", { name: "Mercados", level: 1 })).toBeVisible();
  await expect(page.getByText("Bolsa de Nueva York:")).toBeVisible();
  const sp500 = page.getByRole("link", { name: /^S&P 500/ });
  await expect(sp500).toContainText("7,376.86");
  await expect(sp500).toContainText("+20.13 (+0.27%)");
  await expect(sp500).toContainText("Yahoo Finance");
  await expect(page.getByRole("region", { name: "Datos que necesitan una clave gratuita" })).toContainText("BANXICO_TOKEN");
});

test("detalle: gráfica con periodos, velas e indicadores, y rendimientos", async ({ page }) => {
  await serveMarketData(page);
  await setUp(page);
  await page.getByRole("link", { name: "Mercados" }).first().click();
  await page.getByRole("link", { name: /^S&P 500/ }).click();
  await expect(page.getByRole("heading", { name: "S&P 500", level: 1 })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", { name: "Velas" }).click();
  await page.getByRole("button", { name: "RSI" }).click();
  await page.getByRole("button", { name: "1A", exact: true }).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Rendimientos" })).toContainText("1M");
});

test("mi watchlist guarda los activos elegidos", async ({ page }) => {
  await serveMarketData(page);
  await setUp(page);
  await page.getByRole("link", { name: "Mercados" }).first().click();
  await page.getByRole("region", { name: "Mi watchlist" }).getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Apple").check();
  await page.getByRole("button", { name: "Guardar (1)" }).click();
  await expect(page.getByRole("region", { name: "Mi watchlist" }).getByRole("link", { name: /Apple/ })).toBeVisible();
});
