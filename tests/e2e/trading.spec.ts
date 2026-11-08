import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

// Precios y velas de prueba (inventados solo para la prueba). Se usa bitcoin porque opera a toda hora.
test.use({ serviceWorkers: "block" });

/** Sirve un precio de BTC de hace 10 minutos y una vela de 5 minutos posterior con el máximo y mínimo dados. */
async function serveData(page: Page, bar: { high: number; low: number }) {
  const now = Date.now();
  const market = {
    version: 1,
    generadoEn: new Date(now).toISOString(),
    errores: [],
    activos: {
      btc: { precio: 100000, cierreAnterior: 99000, hora: new Date(now - 10 * 60_000).toISOString(), moneda: "USD", retrasoMin: null, fuente: "Yahoo Finance", mini: [], estado: "ok" },
    },
  };
  const intraday = {
    id: "btc",
    actualizado: new Date(now).toISOString(),
    unDia: [[Math.floor((now - 5 * 60_000) / 1000), 100000, bar.high, bar.low, 100000, 0]],
    cincoDias: [],
  };
  await page.route("**/Boveda-/datos/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/mercados.json")) return route.fulfill({ json: market });
    if (path.endsWith("/intradia/btc.json")) return route.fulfill({ json: intraday });
    return route.fulfill({ status: 404, body: "" });
  });
}

async function openTrading(page: Page) {
  await page.getByRole("link", { name: /^Trading$/ }).first().click();
  await expect(page.getByRole("heading", { name: "Trading", level: 1 })).toBeVisible();
}

async function tab(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Trading" }).getByRole("link", { name }).click();
}

/** Abre un largo de BTC con stop en 98,000 y objetivo en 104,000, marcando el checklist. */
async function openBitcoinTrade(page: Page) {
  await page.getByRole("button", { name: "Nueva operación" }).click();
  const sheet = page.getByRole("dialog", { name: "Nueva operación" });
  await sheet.getByLabel("Activo").selectOption("btc");
  await expect(sheet.getByText("USD 100,000.00")).toBeVisible();
  await sheet.getByLabel("Stop loss").fill("98000");
  await sheet.getByLabel("Objetivo").fill("104000");
  // $10,000 × 1% = $100 de riesgo; entre $2,000 de distancia al stop = 0.05 BTC. Riesgo/beneficio 4,000 / 2,000 = 1:2.
  await expect(sheet.getByLabel("Cantidad")).toHaveValue("0.05");
  await expect(sheet.getByText("1:2", { exact: true })).toBeVisible();
  // Sin el checklist no se abre.
  await sheet.getByRole("button", { name: "Abrir operación" }).click();
  await expect(sheet.getByText("Completa el checklist antes de entrar.")).toBeVisible();
  for (const label of [
    "Identifiqué la tendencia (alcista, bajista o lateral).",
    "El precio está en un nivel clave (soporte o resistencia).",
    "Tengo una confirmación (vela, volumen o indicador).",
    "Revisé si hoy hay datos económicos o noticias fuertes.",
  ]) {
    await sheet.getByLabel(label).check();
  }
  await sheet.getByRole("button", { name: "Abrir operación" }).click();
  await expect(sheet).toBeHidden();
}

test("simulador: tamaño con la regla de riesgo, cierre al objetivo, diario y estadísticas", async ({ page }) => {
  await serveData(page, { high: 105000, low: 99500 });
  await setUp(page);
  await openTrading(page);
  await expect(page.getByRole("complementary", { name: "Aviso de riesgo" })).toContainText("entre 74% y 89%");

  await openBitcoinTrade(page);
  // La vela posterior a la entrada llegó a 105,000: se cierra sola en el objetivo. 0.05 × 4,000 = +$200.
  const closed = page.getByRole("region", { name: "Últimas cerradas" });
  await expect(closed).toContainText("Llegó al objetivo");
  await expect(closed).toContainText("+USD 200.00");
  await expect(page.getByRole("region", { name: "Cuenta de práctica" })).toContainText("USD 10,200.00");

  await closed.getByRole("button", { name: /BTC-USD/ }).click();
  const journal = page.getByRole("dialog", { name: "Diario: BTC-USD" });
  await journal.getByRole("group", { name: "¿Seguiste tu plan?" }).getByRole("button", { name: "Sí" }).click();
  await journal.getByLabel("Lección aprendida").fill("Esperé la confirmación y respeté el tamaño.");
  await journal.getByRole("button", { name: "Guardar diario" }).click();
  await expect(journal).toBeHidden();

  await tab(page, "Estadísticas");
  const summary = page.getByRole("region", { name: "Resumen" });
  await expect(summary).toContainText("+USD 200.00");
  await expect(summary).toContainText("100.0%");
  await expect(page.getByRole("region", { name: "¿Seguiste tu plan?" })).toContainText("Seguí mi plan");
});

test("el límite de pérdida del día bloquea nuevas operaciones", async ({ page }) => {
  await serveData(page, { high: 100500, low: 97000 });
  await setUp(page);
  await openTrading(page);
  await tab(page, "Plan");
  await page.getByLabel("Límite de pérdida del día (%)").fill("0.5");
  await page.getByLabel("Límite de pérdida de la semana (%)").fill("5");
  await page.getByRole("button", { name: "Guardar reglas" }).click();
  await expect(page.getByText("Reglas guardadas")).toBeVisible();

  await tab(page, "Simulador");
  await openBitcoinTrade(page);
  // La vela bajó a 97,000: tocó el stop. Pierdes 0.05 × 2,000 = $100, más que el límite de 0.5% ($50).
  await expect(page.getByRole("region", { name: "Últimas cerradas" })).toContainText("-USD 100.00");
  await expect(page.getByText("Llegaste a tu límite de pérdida del día")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva operación" })).toBeDisabled();
});

test("diario: registra una operación real y aparece en sus estadísticas", async ({ page }) => {
  await setUp(page);
  await openTrading(page);
  await tab(page, "Diario");
  await page.getByRole("button", { name: /^Operaciones reales/ }).click();
  await page.getByRole("button", { name: "Registrar operación real" }).click();
  const sheet = page.getByRole("dialog", { name: "Registrar operación real" });
  await sheet.getByLabel("Activo").fill("walmex");
  await sheet.getByLabel("Entrada (MXN)").fill("60");
  await sheet.getByLabel("Stop loss").fill("58");
  await sheet.getByLabel("Objetivo (opcional)").fill("66");
  await sheet.getByLabel("Títulos").fill("100");
  await sheet.getByLabel("Precio de salida (MXN)").fill("64");
  await sheet.getByRole("group", { name: "¿Seguiste tu plan?" }).getByRole("button", { name: "Sí" }).click();
  await sheet.getByRole("button", { name: "Guardar operación" }).click();
  await expect(sheet).toBeHidden();
  // (64 − 60) × 100 = $400; arriesgaba (60 − 58) × 100 = $200 → +2 R.
  const list = page.getByRole("region", { name: "Cerradas" });
  await expect(list).toContainText("WALMEX");
  await expect(list).toContainText("+$400.00");
  await expect(list).toContainText("+2 R");

  await tab(page, "Estadísticas");
  await page.getByRole("button", { name: /^Operaciones reales/ }).click();
  await expect(page.getByRole("region", { name: "Resumen" })).toContainText("+$400.00");
});

test("calculadoras, plan, revisión semanal y lecciones", async ({ page }) => {
  await setUp(page);
  await openTrading(page);

  await tab(page, "Calculadoras");
  // $10,000 × 1% / ($50 − $48) = 50 títulos; (112 − 100) / (100 − 95) = 1:2.4.
  await expect(page.getByRole("region", { name: "1. Tamaño de posición" })).toContainText("50");
  await expect(page.getByRole("region", { name: "2. Riesgo/beneficio" })).toContainText("1:2.4");
  await expect(page.getByRole("region", { name: "3. Esperanza matemática" })).toContainText("USD 60.00");

  await tab(page, "Plan");
  await page.getByLabel("Qué opero").fill("SPY y QQQ.");
  await page.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByText("Plan guardado")).toBeVisible();

  await tab(page, "Revisión");
  await page.getByLabel("¿Seguiste tu plan en cada operación? ¿En cuáles no, y por qué?").fill("Sí, en todas.");
  await page.getByRole("button", { name: "Guardar revisión" }).click();
  await expect(page.getByText(/^Guardada el /)).toBeVisible();

  await tab(page, "Lecciones");
  await page.getByText("RSI (índice de fuerza relativa)").click();
  await expect(page.getByText(/normalmente en 14 periodos/)).toBeVisible();
});
