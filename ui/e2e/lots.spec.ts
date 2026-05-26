import { expect, test } from "@playwright/test";

import { e2eWorkspace, installAuthenticatedSession } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("lotes carga datos reales, comercializacion y paginacion compartida", async ({ page }) => {
  const lotsResponse = page.waitForResponse(
    (response) =>
	      response.request().method() === "GET" &&
	      response.url().includes("/api/v1/lots?") &&
	      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
      response.ok()
  );

  await page.goto("/admin/lots");
  const response = await lotsResponse;
  const payload = (await response.json()) as {
    data?: {
      data?: Array<{ lot_name?: string }>;
      page_info?: { total?: number };
    };
  };
  const lots = payload.data?.data ?? [];
  expect(lots.length).toBeGreaterThan(0);
  const firstLotName = lots[0]?.lot_name ?? "";
  expect(firstLotName).not.toBe("");

  await expect(page.getByRole("heading", { name: "Lotes" })).toBeVisible();
  await expect(page.getByText(firstLotName).first()).toBeVisible();
  await expect(page.getByText(/Mostrar\s*\d+-\d+\s*de\s*\d+/)).toBeVisible();

  await page.getByRole("button", { name: "Comercialización" }).click();
  const tableHead = page.locator("thead");
  await expect(tableHead.getByText("Ingreso Neto")).toBeVisible();
  await expect(tableHead.getByText("Arriendo")).toBeVisible();
  await expect(tableHead.getByText("Activo Total")).toBeVisible();
  await expect(tableHead.getByText("Resultado Operativo")).toBeVisible();

  if ((payload.data?.page_info?.total ?? lots.length) > 10) {
    await page.getByRole("button", { name: "2" }).click();
    await expect(page.getByText(/Mostrar\s*11-\d+\s*de\s*\d+/)).toBeVisible();
  }

  const selectableLot = page.getByRole("checkbox", { name: /Seleccionar lote/ }).first();
  await selectableLot.check();
  await page
    .getByRole("toolbar", { name: "Acciones masivas" })
    .getByRole("button", { name: "Editar" })
    .click();
  // The lot editor is now the unified project editor (CustomerEditor).
  await expect(page.getByRole("heading", { name: "Editar Proyecto" })).toBeVisible();
});

test("nuevo lote sin campo especifico muestra warning estándar", async ({ page }) => {
  const lotsResponse = page.waitForResponse(
    (response) =>
	      response.request().method() === "GET" &&
	      response.url().includes("/api/v1/lots?") &&
	      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
      response.ok()
  );

  await page.goto("/admin/lots");
  await lotsResponse;

  await page.getByRole("button", { name: "Nuevo" }).click();
  await expect(
    page.getByText("Para crear un lote, seleccioná un campo específico."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).not.toBeVisible();
});
