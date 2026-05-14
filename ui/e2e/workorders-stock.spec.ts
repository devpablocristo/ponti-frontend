import { expect, test } from "@playwright/test";

import { e2eWorkspace, installAuthenticatedSession } from "./helpers/auth";

const supplyIDWithOrders = 470;
const supplyName = "2,4 D EHE AGROTERRUM";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("stock muestra insumos del proyecto", async ({ page }) => {
  const stockResponse = page.waitForResponse(
    (response) =>
	      response.request().method() === "GET" &&
	      response.url().includes("/api/v1/stock?") &&
	      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
      response.ok()
  );

  await page.goto("/admin/stock");
  const response = await stockResponse;
  const payload = (await response.json()) as {
    data?: { items?: Array<{ supply_name?: string }> | null };
  };
  const items = payload.data?.items ?? [];

  await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
  if (items.length > 0) {
    const firstSupplyName = items[0]?.supply_name ?? "";
    expect(firstSupplyName).not.toBe("");
    await expect(page.getByRole("button", { name: firstSupplyName })).toBeVisible();
  }
});

test("ordenes muestra el filtro por insumo aplicado", async ({ page }) => {
  const ordersResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders?") &&
      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
      response.url().includes(`supply_id=${supplyIDWithOrders}`) &&
      response.ok()
  );

  await page.goto(
    `/admin/work-orders?project_id=${e2eWorkspace.projectId}&supply_id=${supplyIDWithOrders}&supply_name=${encodeURIComponent(supplyName)}`
  );
  const response = await ordersResponse;
  const payload = (await response.json()) as {
    data?: { page_info?: { total?: number } };
  };

  await expect(page.getByRole("heading", { name: "Órdenes de Trabajo" })).toBeVisible();
  const supplyFilterBanner = page
    .locator("div")
    .filter({ hasText: "Filtrando órdenes que consumen:" })
    .first();
  await expect(supplyFilterBanner).toBeVisible();
  await expect(supplyFilterBanner).toContainText(supplyName);
  if ((payload.data?.page_info?.total ?? 0) > 0) {
    await expect(page.getByText(/Mostrar\s*1-\d+\s*de\s*\d+/)).toBeVisible();
  }
});

test("ordenes muestra opciones de filtros de todo el proyecto, no solo de la pagina actual", async ({ page }) => {
  const firstPageResponse = page.waitForResponse(
    (response) =>
	      response.request().method() === "GET" &&
	      response.url().includes("/api/v1/work-orders?") &&
	      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
      response.url().includes("per_page=10") &&
      response.ok()
  );
  const filterDatasetResponse = page.waitForResponse(
    (response) =>
	      response.request().method() === "GET" &&
	      response.url().includes("/api/v1/work-orders/filter-rows?") &&
	      response.url().includes(`project_id=${e2eWorkspace.projectId}`) &&
	      response.ok()
	  );

	  await page.goto(`/admin/work-orders?project_id=${e2eWorkspace.projectId}`);
	  await firstPageResponse;
	  const response = await filterDatasetResponse;
	  const payload = await response.json();
	  const rows = payload.data.rows as Array<{ project_name: string; lot_name?: string }>;
	  expect(rows.length).toBeGreaterThan(0);
	  expect(rows.every((row) => row.project_name.includes(e2eWorkspace.project.name))).toBe(true);
  const firstLotName = rows.find((row) => row.lot_name)?.lot_name?.trim() ?? "";
  expect(firstLotName).not.toBe("");

  await page
    .getByRole("columnheader", { name: /Lote/ })
    .getByRole("button", { name: "Filtrar" })
    .click();
  await page.getByPlaceholder("Buscar opción...").fill(firstLotName);

  await expect(
    page
      .getByRole("columnheader", { name: /Lote/ })
      .getByText(firstLotName, { exact: true })
      .first()
  ).toBeVisible();
});
