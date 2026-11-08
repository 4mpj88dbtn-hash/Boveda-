import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

/** Fecha de hoy en Cancún ("aaaa-mm-dd"). */
function cancunToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cancun" }).format(new Date());
}

/** Mismo día (máximo el 28) hace `n` meses. */
function monthsAgo(n: number): string {
  const [year = 0, month = 1, day = 1] = cancunToday().split("-").map(Number);
  const index = year * 12 + month - 1 - n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;
}

async function openQuickAdd(page: Page) {
  await page.getByRole("button", { name: /^Registrar( movimiento)?$/ }).click();
  return page.getByRole("dialog");
}

async function typeAmount(page: Page, amount: string) {
  const dialog = page.getByRole("dialog");
  for (const key of amount) {
    await dialog.getByRole("button", { name: key === "." ? "Punto decimal" : key, exact: true }).click();
  }
}

async function goToFinance(page: Page, tab: string) {
  await page.getByRole("link", { name: "Finanzas" }).first().click();
  await page.getByRole("navigation", { name: "Finanzas" }).getByRole("link", { name: tab }).click();
}

test("presupuesto: avisa al llegar al 80% y lo muestra en el Centro de mando", async ({ page }) => {
  await setUp(page);
  await goToFinance(page, "Presupuestos");
  await page.getByRole("button", { name: "Agregar" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Agregar presupuesto" });
  await sheet.getByLabel("Categoría").selectOption({ label: "Comida" });
  await sheet.getByLabel("Límite al mes (pesos)").fill("1000");
  await sheet.getByRole("button", { name: "Guardar presupuesto" }).click();
  await expect(sheet).toBeHidden();

  const dialog = await openQuickAdd(page);
  await typeAmount(page, "850");
  await dialog.getByRole("button", { name: "Comida", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Llevas el 85% del presupuesto de Comida" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Comida/ }).first()).toContainText("85%");

  await page.getByRole("link", { name: /Mando|Centro de mando/ }).first().click();
  await expect(page.getByRole("region", { name: "Para hoy" })).toContainText("85% del presupuesto de Comida");
});

test("recurrente automático: registra solos los meses que ya pasaron", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "8000");
  await dialog.getByRole("button", { name: "Casa y renta", exact: true }).click();
  await dialog.getByLabel("Fecha").fill(monthsAgo(2));
  await dialog.getByRole("button", { name: "Más detalles" }).click();
  await dialog.getByLabel("Repetir").selectOption({ label: "Cada mes" });
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  // El de este mes ya se registró solo.
  await goToFinance(page, "Movimientos");
  await expect(page.getByRole("button", { name: /Casa y renta/ })).toContainText("-$8,000.00");
  await page.getByRole("navigation", { name: "Finanzas" }).getByRole("link", { name: "Recurrentes" }).click();
  await expect(page.getByRole("button", { name: /Casa y renta/ })).toContainText("Cada mes");
});

test("recurrente con confirmación: se registra desde Para hoy", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "299");
  await dialog.getByRole("button", { name: "Suscripciones", exact: true }).click();
  await dialog.getByLabel("Fecha").fill(monthsAgo(1));
  await dialog.getByRole("button", { name: "Más detalles" }).click();
  await dialog.getByLabel("Repetir").selectOption({ label: "Cada mes" });
  await dialog.getByLabel("Cómo registrarlo").selectOption({ label: "Pedirme confirmación" });
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  const today = page.getByRole("region", { name: "Para hoy" });
  await expect(today).toContainText("Por confirmar: Suscripciones");
  await today.getByRole("button", { name: "Registrar" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirmar recurrente" });
  await expect(confirm.locator("output")).toHaveText("$299");
  await confirm.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByText("Por confirmar: Suscripciones")).toBeHidden();
});

test("plantilla: se guarda una vez y luego se usa con un toque", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "45");
  await dialog.getByRole("button", { name: "Restaurantes", exact: true }).click();
  await dialog.getByRole("button", { name: "Más detalles" }).click();
  await dialog.getByLabel("Guardar también como plantilla").check();
  await dialog.getByLabel("Nombre de la plantilla").fill("Café");
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  const again = await openQuickAdd(page);
  await again.getByRole("button", { name: /^Café/ }).click();
  await expect(again.locator("output")).toHaveText("$45");
  await again.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gasto guardado: $45.00 · Restaurantes" })).toBeVisible();
});

test("subcategoría: se crea en Categorías y se elige al registrar", async ({ page }) => {
  await setUp(page);
  await goToFinance(page, "Categorías");
  await page.getByRole("region", { name: "Gastos" }).getByRole("button", { name: "Agregar" }).click();
  const sheet = page.getByRole("dialog", { name: "Nueva categoría de gasto" });
  await sheet.getByLabel("Nombre").fill("Tacos");
  await sheet.getByLabel("Es subcategoría de").selectOption({ label: "Comida" });
  await sheet.getByRole("button", { name: "Guardar categoría" }).click();
  await expect(sheet).toBeHidden();

  const dialog = await openQuickAdd(page);
  await typeAmount(page, "120");
  await dialog.getByRole("button", { name: "Comida", exact: true }).click();
  await dialog.getByRole("button", { name: "Tacos", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gasto guardado: $120.00 · Tacos" })).toBeVisible();
});

test("foto del ticket: se guarda con el movimiento", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "310");
  await dialog.getByRole("button", { name: "Súper", exact: true }).click();
  await dialog.getByRole("button", { name: "Más detalles" }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await dialog.getByLabel("Elegir foto del ticket").setInputFiles({ name: "ticket.png", mimeType: "image/png", buffer: png });
  await expect(dialog.getByRole("img", { name: "Foto del ticket" })).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  await goToFinance(page, "Movimientos");
  await page.getByRole("button", { name: /Súper/ }).click();
  await expect(page.getByRole("dialog", { name: "Editar movimiento" }).getByRole("img", { name: "Foto del ticket" })).toBeVisible();
});

test("resúmenes: muestra la semana y descarga el PDF", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "500");
  await dialog.getByRole("button", { name: "Comida", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  await goToFinance(page, "Resúmenes");
  // Si la semana aún no se cierra (domingo 20:00), se ve como "en curso".
  const next = page.getByRole("button", { name: "Periodo siguiente" });
  if (await next.isEnabled()) await next.click();
  await expect(page.getByRole("region", { name: "En qué se fue" })).toContainText("Comida");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^boveda-resumen-semanal-\d{4}-\d{2}-\d{2}\.pdf$/);
  const pdf = await readFile(await download.path(), "latin1");
  expect(pdf.startsWith("%PDF-1.4")).toBe(true);
  expect(pdf).toContain("Resumen semanal");
});
