import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

const supplyName = "2-4D ESTER DEFERON ETIL EXIL X 20 LTS";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("stock muestra insumos del proyecto", async ({ page }) => {
  const stockResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/stock/30") &&
      response.ok()
  );

  await page.goto("/admin/stock");
  await stockResponse;

  await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
  await expect(page.getByRole("button", { name: supplyName })).toBeVisible();
});

test("ordenes respeta filtro por insumo y conserva paginacion server-side", async ({ page }) => {
  const ordersResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders?") &&
      response.url().includes("project_id=30") &&
      response.url().includes("supply_id=549") &&
      response.ok()
  );

  await page.goto(
    `/admin/work-orders?project_id=30&supply_id=549&supply_name=${encodeURIComponent(supplyName)}`
  );
  await ordersResponse;

  await expect(page.getByRole("heading", { name: "Órdenes de Trabajo" })).toBeVisible();
  const supplyFilterBanner = page
    .locator("div")
    .filter({ hasText: "Filtrando órdenes que consumen:" })
    .first();
  await expect(supplyFilterBanner).toBeVisible();
  await expect(supplyFilterBanner).toContainText(supplyName);
  await expect(page.getByText("Cantidad Total de Órdenes")).toBeVisible();
  await expect(page.getByText(/Mostrar\s*1-10\s*de\s*\d+/)).toBeVisible();
});

test("ordenes muestra opciones de filtros de todo el proyecto, no solo de la pagina actual", async ({ page }) => {
  const firstPageResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders?") &&
      response.url().includes("project_id=30") &&
      response.url().includes("per_page=10") &&
      response.ok()
  );
  const filterDatasetResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders/filter-rows?") &&
      response.url().includes("project_id=30") &&
      response.ok()
  );

  await page.goto("/admin/work-orders?project_id=30");
  await firstPageResponse;
  const response = await filterDatasetResponse;
  const payload = await response.json();
  expect(
    (payload.data.rows as Array<{ project_name: string }>).every((row) =>
      row.project_name.includes("JUJUY")
    )
  ).toBe(true);

  await page
    .getByRole("columnheader", { name: /Lote/ })
    .getByRole("button", { name: "Filtrar" })
    .click();
  await page.getByPlaceholder("Buscar opción...").fill("LOTE 1");

  await expect(page.getByText("LOTE 1", { exact: true })).toBeVisible();
});
