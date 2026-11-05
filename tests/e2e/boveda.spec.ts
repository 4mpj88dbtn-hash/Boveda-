import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { BASE, PIN, setUp, typePin } from "./helpers";

test("primera vez: pide nombre y PIN, rechaza PIN obvios y llega al Centro de mando", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await page.getByLabel("¿Cómo quieres que te salude? (opcional)").fill("Ana");
  await page.getByRole("button", { name: "Continuar" }).click();

  await typePin(page, "123456");
  await expect(page.getByRole("status").filter({ hasText: "fácil de adivinar" })).toBeVisible();

  await typePin(page, PIN);
  await expect(page.getByRole("heading", { name: "Confirma tu PIN" })).toBeVisible();
  await typePin(page, "482916");
  await expect(page.getByRole("status").filter({ hasText: "Los PIN no coinciden" })).toBeVisible();

  await typePin(page, PIN);
  await typePin(page, PIN);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Buenos días|Buenas tardes|Buenas noches), Ana$/);
  await expect(page.getByRole("heading", { name: "Patrimonio neto" })).toBeVisible();
  await expect(page.getByText("Información educativa. No es asesoría financiera.")).toBeVisible();
});

test("al volver a abrir pide el PIN y avisa cuántos intentos quedan", async ({ page }) => {
  await setUp(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Escribe tu PIN" })).toBeVisible();

  await typePin(page, "000001");
  await expect(page.getByRole("status").filter({ hasText: "PIN incorrecto" })).toContainText("quedan 4 intentos");

  await typePin(page, PIN);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Ana$/);
});

test("ajustes: cambia el nombre, descarga un respaldo sin el PIN y bloquea", async ({ page }) => {
  await setUp(page);
  await page.getByRole("link", { name: "Ajustes" }).click();
  await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();

  await page.getByLabel("Tu nombre para el saludo").fill("Luis");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByText("Nombre guardado.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar respaldo" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^boveda-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(backup.app).toBe("boveda");
  expect(backup.data.settings).toContainEqual({ key: "displayName", value: "Luis" });
  expect(JSON.stringify(backup)).not.toContain("PBKDF2");
  await expect(page.getByText(/Último respaldo: \d{2}\/\d{2}\/\d{4}/)).toBeVisible();

  await page.getByRole("button", { name: "Bloquear ahora" }).click();
  await expect(page.getByRole("heading", { name: "Escribe tu PIN" })).toBeVisible();
  await typePin(page, PIN);
  await page.getByRole("link", { name: /Mando|Centro de mando/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Luis$/);
});

test("sin internet la app abre igual", async ({ page, context }) => {
  await setUp(page);
  // Espera a que el service worker termine de guardar la app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Escribe tu PIN" })).toBeVisible();
  await typePin(page, PIN);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Ana$/);
  await page.getByRole("link", { name: "Finanzas" }).first().click();
  await expect(page.getByRole("heading", { name: "Finanzas", level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test("borrar todo vuelve a la configuración inicial", async ({ page }) => {
  await setUp(page);
  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: "Borrar todos los datos" }).click();
  const confirm = page.getByRole("button", { name: "Borrar todo y empezar de nuevo" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Escribe “borrar” para confirmar").fill("borrar");
  await confirm.click();
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
});
