import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("lotes carga datos reales, comercializacion y paginacion compartida", async ({ page }) => {
  const lotsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/lots?") &&
      response.url().includes("project_id=30") &&
      response.ok()
  );

  await page.goto("/admin/lots");
  await lotsResponse;

  await expect(page.getByRole("heading", { name: "Lotes" })).toBeVisible();
  await expect(page.getByText("LOTE 54").first()).toBeVisible();
  await expect(page.getByText(/Mostrar\s*1-10\s*de\s*21/)).toBeVisible();

  await page.getByRole("button", { name: "Comercialización" }).click();
  const tableHead = page.locator("thead");
  await expect(tableHead.getByText("Ingreso Neto")).toBeVisible();
  await expect(tableHead.getByText("Arriendo")).toBeVisible();
  await expect(tableHead.getByText("Activo Total")).toBeVisible();
  await expect(tableHead.getByText("Resultado Operativo")).toBeVisible();
  const lot54Row = page.getByRole("row", { name: /LOTE 54 / }).first();
  await expect(lot54Row.getByText("u$ 150")).toBeVisible();
  await expect(lot54Row.getByText("u$ 433")).toBeVisible();
  await expect(lot54Row.getByText("u$ -433")).toBeVisible();

  await page.getByRole("button", { name: "2" }).click();
  await expect(page.getByText(/Mostrar\s*11-20\s*de\s*21/)).toBeVisible();
  await expect(page.getByText("LOTE 52").first()).toBeVisible();

  await page.getByRole("checkbox", { name: "Seleccionar lote LOTE 52" }).check();
  await page
    .getByRole("toolbar", { name: "Acciones masivas" })
    .getByRole("button", { name: "Editar" })
    .click();
  await expect(
    page.getByRole("heading", { name: /JUJUY \(MEALLA\/ACHERAL\).*LOTE 52/ })
  ).toBeVisible();
  await expect(page.locator('input[name="sowingDate1"]')).toBeVisible();
  await expect(page.locator('input[name="variety"]')).toBeVisible();
});

test("nuevo lote sin campo especifico muestra warning estándar", async ({ page }) => {
  const lotsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/lots?") &&
      response.url().includes("project_id=30") &&
      response.ok()
  );

  await page.goto("/admin/lots");
  await lotsResponse;

  await page.getByRole("button", { name: "Nuevo" }).click();
  await expect(
    page.getByText("Para crear un lote, seleccioná un campo específico."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo lote" })).not.toBeVisible();
});
