import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

function sseDonePayload(raw: string): Record<string, unknown> {
  for (const block of raw.split("\n\n")) {
    if (!block.includes("event: done")) continue;
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n");
    if (!data) continue;
    return JSON.parse(data) as Record<string, unknown>;
  }
  throw new Error(`SSE did not include a done event:\n${raw}`);
}

function collectApiServerErrors(page: Page): string[] {
  const serverErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  return serverErrors;
}

async function sendStreamingPrompt(page: Page, prompt: string) {
  const messageInput = page.getByPlaceholder("Mensaje…");
  await expect(messageInput).toBeEnabled();

  const streamResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/ai/chat/stream") &&
      response.ok(),
    { timeout: 90_000 }
  );

  await messageInput.fill(prompt);
  await page.getByRole("button", { name: "Enviar" }).click();

  const response = await streamResponse;
  return sseDonePayload(await response.text());
}

test("asistente responde por Axis y muestra evidencia del run", async ({ page }) => {
  const serverErrors = collectApiServerErrors(page);

  await page.goto("/admin/ai-assistant");

  await expect(page.getByRole("heading", { name: "Asistente" })).toBeVisible();
  await expect(page.getByText("Axis", { exact: true })).toBeVisible();
  const done = await sendStreamingPrompt(page, "Respondeme corto si estas usando Axis y un modelo real.");

  expect(done.routing_source).toBe("axis");
  expect(String(done.axis_run_id ?? "")).toMatch(/^[0-9a-f-]{36}$/);
  expect(String(done.axis_task_id ?? "")).toMatch(/^[0-9a-f-]{36}$/);
  expect(String(done.reply ?? "").trim().length).toBeGreaterThan(0);

  await expect(page.getByText(/Axis Companion|Axis/i).last()).toBeVisible();
  await expect(page.locator("#main-scroll").getByText("Evidencia", { exact: true })).toBeVisible();
  await expect(page.getByText(/run [0-9a-f]{8}/i)).toBeVisible();
  await expect(page.getByText(/task [0-9a-f]{8}/i)).toBeVisible();

  expect(serverErrors).toEqual([]);
});

test("navegación AI renderiza pantallas por módulo", async ({ page }) => {
  const screens = [
    ["/admin/ai/axis", "Centro Axis"],
    ["/admin/ai/operations", "Agente Operativo"],
    ["/admin/ai-assistant", "Asistente"],
    ["/admin/ai/dashboard", "IA Dashboard"],
    ["/admin/ai/stock", "IA Stock"],
    ["/admin/ai/work-orders", "IA Órdenes y Labores"],
    ["/admin/ai/lots", "IA Lotes"],
    ["/admin/ai/supplies", "IA Insumos"],
    ["/admin/ai/reports", "IA Informes"],
    ["/admin/ai/insights", "IA Insights"],
    ["/admin/ai/activity", "Actividad IA"],
  ] as const;

  for (const [path, heading] of screens) {
    const response = await page.goto(path);
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expect(page.getByText("Axis", { exact: true })).toBeVisible();
  }
});

test("asistente consulta tools de informes por Axis", async ({ page }) => {
  const serverErrors = collectApiServerErrors(page);

  await page.goto("/admin/ai-assistant");

  await expect(page.getByRole("heading", { name: "Asistente" })).toBeVisible();
  const contextSelect = page.getByLabel("Contexto");
  await contextSelect.selectOption("reports");
  await expect(contextSelect).toHaveValue("reports");

  const done = await sendStreamingPrompt(
    page,
    "Resumí los informes económicos de la campaña y explicá el resultado operativo."
  );
  const toolCalls = Array.isArray(done.tool_calls) ? done.tool_calls : [];
  const serializedTools = JSON.stringify(toolCalls);

  expect(done.routing_source).toBe("axis");
  expect(toolCalls.length).toBeGreaterThan(0);
  expect(serializedTools).toContain("ponti_reports");
  expect(serializedTools).not.toMatch(/capability blocked|control plane|denied|error/i);
  expect(String(done.reply ?? "")).not.toMatch(/no tengo acceso a los informes/i);

  await expect(page.getByText(/ponti_reports_/i)).toBeVisible({ timeout: 30_000 });
  expect(serverErrors).toEqual([]);
});

test("agente operativo genera decisiones de stock con evidencia", async ({ page }) => {
  const serverErrors = collectApiServerErrors(page);

  await page.goto("/admin/ai/stock");

  await expect(page.getByRole("heading", { name: "IA Stock" })).toBeVisible();
  await expect(page.getByText("Axis", { exact: true })).toBeVisible();

  const analyze = page.getByRole("button", { name: /Analizar ahora/i });
  await expect(analyze).toBeEnabled({ timeout: 30_000 });

  const runResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/ai/decision-runs") &&
      response.ok(),
    { timeout: 60_000 }
  );
  await analyze.click();
  await runResponse;

  await expect(page.getByText(/Stock negativo|Diferencia relevante|Falta conteo/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Evidencia", { exact: true })).toBeVisible();
  await expect(page.getByText("ponti.stock.summary").first()).toBeVisible();
  expect(serverErrors).toEqual([]);
});

test("agente prepara acción gobernada sin write final", async ({ page }) => {
  const serverErrors = collectApiServerErrors(page);

  await page.goto("/admin/ai/stock");

  await expect(page.getByRole("heading", { name: "IA Stock" })).toBeVisible();
  const analyze = page.getByRole("button", { name: /Analizar ahora/i });
  await expect(analyze).toBeEnabled({ timeout: 30_000 });

  const runResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/ai/decision-runs") &&
      response.ok(),
    { timeout: 60_000 }
  );
  await analyze.click();
  await runResponse;

  const approvalButton = page.getByRole("button", { name: /Pedir aprobación/i }).first();
  await expect(approvalButton).toBeVisible({ timeout: 30_000 });

  const actionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/ai/decision-cards/") &&
      response.url().includes("/actions/") &&
      response.ok(),
    { timeout: 30_000 }
  );
  await approvalButton.click();
  const payload = (await (await actionResponse).json()) as Record<string, unknown>;

  expect(payload.approval_required).toBe(true);
  expect(payload.write_performed).toBe(false);
  expect(payload.execution_status).toBe("pending_approval");
  expect(payload.execution_blocked_by).toBe("nexus_required");
  await expect(page.getByText(/Acción preparada para aprobación Nexus/i)).toBeVisible();
  expect(serverErrors).toEqual([]);
});
