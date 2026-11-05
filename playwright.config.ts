import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Las pruebas usan las mismas claves locales que la app.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.PORT ?? 3100);

/**
 * Pruebas de flujo completo. Requieren la base local corriendo (`npm run db:start`)
 * y un archivo `.env.local` con las claves locales (ver README).
 */
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
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/entrar`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
