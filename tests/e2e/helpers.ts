import { expect, type Page } from "@playwright/test";

export const BASE = "/Boveda-";
export const PIN = "482915";

/** Escribe un PIN tocando el teclado de la pantalla. */
export async function typePin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

/** Configura la app por primera vez con un nombre y el PIN de prueba. */
export async function setUp(page: Page, name = "Ana"): Promise<void> {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await page.getByLabel("¿Cómo quieres que te salude? (opcional)").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Crea tu PIN" })).toBeVisible();
  await typePin(page, PIN);
  await expect(page.getByRole("heading", { name: "Confirma tu PIN" })).toBeVisible();
  await typePin(page, PIN);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(new RegExp(`, ${name}$`));
}
