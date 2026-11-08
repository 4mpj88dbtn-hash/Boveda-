import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { setUp } from "./helpers";

/** Abre el registro rápido con el botón + (celular) o "Registrar" (computadora). */
async function openQuickAdd(page: Page) {
  await page.getByRole("button", { name: /^Registrar( movimiento)?$/ }).click();
  return page.getByRole("dialog", { name: "Registrar" });
}

async function typeAmount(page: Page, amount: string) {
  const dialog = page.getByRole("dialog");
  for (const key of amount) {
    await dialog.getByRole("button", { name: key === "." ? "Punto decimal" : key, exact: true }).click();
  }
}

test("registra un gasto con monto, categoría y guardar, y lo muestra en todos lados", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "250");
  await expect(dialog.locator("output")).toHaveText("$250");
  await dialog.getByRole("button", { name: "Comida", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Gasto guardado: $250.00 · Comida" })).toBeVisible();
  const month = page.getByRole("region", { name: "Este mes" });
  await expect(month.getByRole("definition").nth(1)).toHaveText("$250.00");
  await expect(page.getByRole("region", { name: "Patrimonio neto" })).toContainText("-$250.00");

  await page.getByRole("link", { name: "Ver movimientos" }).click();
  await expect(page.getByRole("heading", { name: "Finanzas", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Hoy" }).getByRole("button", { name: /Comida/ })).toContainText(
    "-$250.00",
  );
});

test("Deshacer quita el gasto recién guardado", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "99.5");
  await dialog.getByRole("button", { name: "Súper", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByText("Sin movimientos este mes")).toBeVisible();
});

test("pide la categoría y, en dólares, el tipo de cambio", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await dialog.getByRole("button", { name: "USD", exact: true }).click();
  await typeAmount(page, "20");
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Elige una categoría.");

  await dialog.getByRole("button", { name: "Restaurantes", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Escribe el tipo de cambio: cuántos pesos vale 1 dólar.");

  await dialog.getByLabel("Tipo de cambio (pesos por 1 dólar)").fill("18.25");
  await expect(dialog.getByText("≈ $365.00")).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gasto guardado: USD 20.00 · Restaurantes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Este mes" }).getByRole("definition").nth(1)).toHaveText("$365.00");

  // La siguiente vez sugiere el tipo de cambio que escribiste, con su fecha.
  const again = await openQuickAdd(page);
  await again.getByRole("button", { name: "USD", exact: true }).click();
  await expect(again.getByLabel("Tipo de cambio (pesos por 1 dólar)")).toHaveValue("18.25");
  await expect(again.getByText(/El último que escribiste, del \d{2}\/\d{2}\/\d{4}\./)).toBeVisible();
});

test("edita y elimina un movimiento desde el historial", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "1200");
  await dialog.getByRole("button", { name: "Ingreso", exact: true }).click();
  await dialog.getByRole("button", { name: "Honorarios", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar ingreso" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "Ver movimientos" }).click();
  await page.getByRole("button", { name: /Honorarios/ }).click();
  const edit = page.getByRole("dialog", { name: "Editar movimiento" });
  await expect(edit.locator("output")).toHaveText("$1,200");
  for (let i = 0; i < 4; i += 1) await edit.getByRole("button", { name: "Borrar", exact: true }).click();
  await typeAmount(page, "1500");
  await edit.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole("button", { name: /Honorarios/ })).toContainText("+$1,500.00");

  await page.getByRole("button", { name: /Honorarios/ }).click();
  await page.getByRole("button", { name: "Eliminar movimiento" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Movimiento eliminado" })).toBeVisible();
  await expect(page.getByText("Aún no hay movimientos")).toBeVisible();
});

test("cuentas: agrega banco y tarjeta, transfiere y el patrimonio cuadra", async ({ page }) => {
  await setUp(page);
  await page.getByRole("link", { name: "Finanzas" }).first().click();
  await page.getByRole("link", { name: "Cuentas" }).click();

  async function addAccount(name: string, kind: string, balance: string) {
    await page.getByRole("button", { name: "Agregar cuenta" }).click();
    const sheet = page.getByRole("dialog", { name: "Agregar cuenta" });
    await sheet.getByLabel("Nombre").fill(name);
    await sheet.getByLabel("Tipo").selectOption({ label: kind });
    await sheet.getByLabel(kind === "Tarjeta de crédito" ? "Lo que debes hoy" : "Saldo de hoy").fill(balance);
    await sheet.getByRole("button", { name: "Guardar cuenta" }).click();
    await expect(sheet).toBeHidden();
  }

  await addAccount("Banco nómina", "Banco", "20,000");
  await addAccount("Tarjeta Oro", "Tarjeta de crédito", "5000");
  const summary = page.getByRole("region", { name: "Patrimonio neto" });
  await expect(summary).toContainText("$15,000.00");
  await expect(page.getByRole("button", { name: /Tarjeta Oro/ })).toContainText("Debes$5,000.00");

  await page.getByRole("button", { name: "Transferir" }).click();
  const transfer = page.getByRole("dialog", { name: "Registrar" });
  await transfer.getByLabel("Sale de").selectOption({ label: "Banco nómina · MXN" });
  await transfer.getByLabel("Entra a").selectOption({ label: "Tarjeta Oro · MXN" });
  await typeAmount(page, "5000");
  await transfer.getByRole("button", { name: "Guardar transferencia" }).click();
  await expect(transfer).toBeHidden();

  // Pagar la tarjeta no cambia el patrimonio: solo mueve dinero.
  await expect(summary).toContainText("$15,000.00");
  await expect(page.getByRole("button", { name: /Banco nómina/ })).toContainText("$15,000.00");
  await expect(page.getByRole("button", { name: /Tarjeta Oro/ })).toContainText("$0.00");
});

test("el respaldo guarda los movimientos y los restaura", async ({ page }) => {
  await setUp(page);
  const dialog = await openQuickAdd(page);
  await typeAmount(page, "80");
  await dialog.getByRole("button", { name: "Transporte", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "Ajustes" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar respaldo" }).click();
  const file = await (await downloadPromise).path();
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.version).toBe(4);
  expect(backup.data.transactions).toHaveLength(1);
  expect(backup.data.transactions[0]).toMatchObject({ amountCents: 8000, categoryId: "gasto-transporte" });

  // Se borra el gasto y se recupera con el respaldo.
  await page.getByRole("link", { name: "Finanzas" }).first().click();
  await page.getByRole("button", { name: /Transporte/ }).click();
  await page.getByRole("button", { name: "Eliminar movimiento" }).click();
  await expect(page.getByText("Aún no hay movimientos")).toBeVisible();

  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.getByLabel("Elegir archivo de respaldo").setInputFiles(file);
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByText("Respaldo restaurado.")).toBeVisible();
  await page.getByRole("link", { name: "Finanzas" }).first().click();
  await expect(page.getByRole("button", { name: /Transporte/ })).toContainText("-$80.00");
});
