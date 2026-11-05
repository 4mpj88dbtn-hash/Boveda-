import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

/** Pruebas de flujo completo sobre la app compilada, servida como en GitHub Pages. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-MX",
    timezoneId: "America/Cancun",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && node scripts/servir.mjs`,
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/Boveda-/`,
    // Siempre compila y arranca un servidor nuevo: así se prueba exactamente lo que hay en el código.
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
