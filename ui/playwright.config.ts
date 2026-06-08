import { defineConfig, devices } from "@playwright/test";

const runtimeEnv =
  (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

const isCi = runtimeEnv.CI === "true" || runtimeEnv.CI === "1";
const port = runtimeEnv.PLAYWRIGHT_PORT ?? "5173";
const baseURL = runtimeEnv.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const skipWebServer = runtimeEnv.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !isCi,
        timeout: 120_000,
        env: {
          BFF_URL: runtimeEnv.BFF_URL ?? "http://localhost:3000",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
