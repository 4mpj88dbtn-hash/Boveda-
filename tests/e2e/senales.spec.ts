import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

// Noticias, calendario y señales servidos con archivos de prueba (inventados solo para la prueba).
test.use({ serviceWorkers: "block" });

const now = new Date();
const later = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

const files: Record<string, unknown> = {
  "mercados.json": {
    version: 1,
    generadoEn: now.toISOString(),
    errores: [],
    activos: {
      voo: { precio: 449.5, cierreAnterior: 452, hora: now.toISOString(), moneda: "USD", retrasoMin: null, fuente: "Yahoo Finance", mini: [], estado: "ok" },
    },
  },
  "noticias.json": {
    version: 1,
    generadoEn: now.toISOString(),
    fuentes: [{ nombre: "Reserva Federal", estado: "ok" }],
    noticias: [
      {
        id: "n1",
        titulo: "Prueba: la Fed publica su comunicado",
        enlace: "https://example.com/fed",
        fuente: "Reserva Federal",
        fecha: now.toISOString(),
        resumen: "",
        temas: ["fed"],
        activos: ["sp500"],
        prioridad: "critica",
        otrasFuentes: [],
      },
      {
        id: "n2",
        titulo: "Prueba: bitcoin se mueve",
        enlace: "https://example.com/btc",
        fuente: "CoinDesk",
        fecha: now.toISOString(),
        resumen: "",
        temas: ["cripto"],
        activos: ["btc"],
        prioridad: "informativa",
        otrasFuentes: [],
      },
    ],
  },
  "calendario.json": {
    version: 1,
    generadoEn: now.toISOString(),
    fuentes: [{ nombre: "Reserva Federal", estado: "ok" }],
    eventos: [
      {
        id: "e1",
        fecha: later(26),
        titulo: "Decisión de tasas de la Fed (FOMC)",
        pais: "EE. UU.",
        tipo: "fomc",
        importancia: "alta",
        fuente: "Reserva Federal",
        enlace: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      },
    ],
  },
  "senales.json": {
    version: 1,
    generadoEn: now.toISOString(),
    senales: [{ fecha: now.toISOString(), tipo: "cierre", prioridad: "importante", titulo: "Cierre del mercado", texto: "🔔 Cierre de Wall Street\n• S&P 500: 7,376.86 (+0.27%)" }],
  },
};

async function serveData(page: Page) {
  await page.route("**/Boveda-/datos/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/datos/")[1] ?? "";
    const body = files[name];
    return body ? route.fulfill({ json: body }) : route.fulfill({ status: 404, body: "" });
  });
}

async function openSignals(page: Page) {
  await page.getByRole("link", { name: "Señales" }).first().click();
  await expect(page.getByRole("heading", { name: "Señales", level: 1 })).toBeVisible();
}

test("Centro de mando y Señales muestran avisos y noticias con su fuente", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await expect(page.getByRole("region", { name: "Señales recientes" })).toContainText("Cierre del mercado");
  await expect(page.getByRole("region", { name: "Noticias" })).toContainText("Prueba: la Fed publica su comunicado");

  await openSignals(page);
  await expect(page.getByRole("region", { name: "Señales recientes" })).toContainText("S&P 500: 7,376.86");
});

test("alerta de precio del dispositivo: se cumple y entra en la configuración de Telegram", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await openSignals(page);
  await page.getByRole("region", { name: "Mis alertas de precio" }).getByRole("button", { name: "Agregar" }).click();
  const sheet = page.getByRole("dialog", { name: "Nueva alerta de precio" });
  await sheet.getByLabel("Activo").selectOption({ label: "VOO (Vanguard S&P 500)" });
  await sheet.getByLabel("Avísame si").selectOption({ label: "Baja de" });
  await sheet.getByLabel("Precio").fill("450");
  await sheet.getByRole("button", { name: "Guardar alerta" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("region", { name: "Mis alertas de precio" })).toContainText("Se cumplió");

  const config = page.getByLabel("Valor para SENALES_CONFIG");
  await expect(config).toHaveValue(/"alertasPrecio":\[\{"id":"voo","condicion":"menor","valor":450\}\]/);
  await page.getByLabel("Cierre del mercado").uncheck();
  await expect(config).toHaveValue(/"cierre":false/);
});

test("noticias: filtro por tema, guardar y calendario", async ({ page }) => {
  await serveData(page);
  await setUp(page);
  await openSignals(page);
  await page.getByRole("navigation", { name: "Señales" }).getByRole("link", { name: "Noticias" }).click();
  await page.getByRole("button", { name: "Cripto", exact: true }).click();
  await expect(page.getByText("Prueba: bitcoin se mueve")).toBeVisible();
  await expect(page.getByText("Prueba: la Fed publica su comunicado")).toBeHidden();
  await page.getByRole("button", { name: "Guardar noticia" }).click();
  await page.getByRole("button", { name: "Guardadas", exact: true }).click();
  await expect(page.getByText("Prueba: bitcoin se mueve")).toBeVisible();

  await page.getByRole("navigation", { name: "Señales" }).getByRole("link", { name: "Calendario" }).click();
  await expect(page.getByText("Decisión de tasas de la Fed (FOMC)")).toBeVisible();
  await expect(page.getByRole("link", { name: /Fuente: Reserva Federal/ })).toBeVisible();
});
