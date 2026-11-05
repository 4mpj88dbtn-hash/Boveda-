import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser, freshCode, type TestUser } from "./helpers";

test.describe.configure({ mode: "serial" });

test("sin sesión, cualquier pantalla manda a Entrar", async ({ page }) => {
  for (const path of ["/", "/finanzas", "/ajustes", "/entrar/verificar"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar$/);
  }
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("la pantalla sin conexión se ve sin sesión", async ({ page }) => {
  await page.goto("/sin-conexion");
  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
});

test.describe("con una cuenta", () => {
  let user: TestUser | undefined;

  test.beforeEach(async () => {
    user = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(user);
  });

  test("entra, activa el 2FA, cambia el saludo y vuelve a entrar con su código", async ({ page }) => {
    test.setTimeout(120_000);
    if (!user) throw new Error("Falta el usuario de prueba");

    // Contraseña equivocada: mensaje claro y el correo se conserva.
    await page.goto("/entrar");
    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña").fill("contraseña-equivocada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Correo o contraseña incorrectos.");
    await expect(page.getByLabel("Correo")).toHaveValue(user.email);

    // Primera vez: obliga a activar el 2FA.
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/entrar\/activar-2fa$/);
    await expect(page.getByRole("heading", { name: "Activa tu 2FA" })).toBeVisible();

    // Sin activar el 2FA no se puede entrar a la app.
    await page.goto("/");
    await expect(page).toHaveURL(/\/entrar\/activar-2fa$/);

    const secret = (await page.locator("code").first().textContent())?.replace(/\s/g, "") ?? "";
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    const firstCode = await freshCode(secret);
    await page.getByLabel("Código de 6 dígitos").fill(firstCode);
    await page.getByRole("button", { name: "Activar 2FA" }).click();

    // Centro de mando con el saludo según la hora de Cancún.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Buenos días|Buenas tardes|Buenas noches)$/);
    await expect(page.getByRole("heading", { name: "Patrimonio neto" })).toBeVisible();
    await expect(page.getByText("Información educativa. No es asesoría financiera.")).toBeVisible();

    // El saludo usa el nombre guardado en Ajustes.
    await page.getByRole("link", { name: "Ajustes" }).click();
    await expect(page).toHaveURL(/\/ajustes$/);
    await page.getByLabel("Tu nombre para el saludo").fill("Ana");
    await page.getByRole("button", { name: "Guardar nombre" }).click();
    await expect(page.getByText("Nombre guardado.")).toBeVisible();
    await expect(page.getByLabel("Tu nombre para el saludo")).toHaveValue("Ana");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Ana$/);

    // El botón + abre el registro rápido (llega completo en la Fase 1).
    await page.getByRole("button", { name: /Registrar/ }).first().click();
    await expect(page.getByRole("heading", { name: "Registro rápido" })).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(page.getByRole("heading", { name: "Registro rápido" })).toBeHidden();

    // Cerrar sesión y volver a entrar: ahora pide el código.
    await page.goto("/ajustes");
    await page.getByRole("button", { name: "Cerrar sesión en este dispositivo" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/entrar$/);

    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/entrar\/verificar$/);

    await page.getByLabel("Código de 6 dígitos").fill("000000");
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("El código no coincide");

    const secondCode = await freshCode(secret, firstCode);
    await page.getByLabel("Código de 6 dígitos").fill(secondCode);
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Ana$/);
  });
});
