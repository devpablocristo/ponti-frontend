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
  await expect(page.getByText("u$ 150").first()).toBeVisible();
  await expect(page.getByText("u$ 433").first()).toBeVisible();
  await expect(page.getByText("u$ -433").first()).toBeVisible();

  await page.getByRole("button", { name: "2" }).click();
  await expect(page.getByText(/Mostrar\s*11-20\s*de\s*21/)).toBeVisible();
  await expect(page.getByText("LOTE 52").first()).toBeVisible();

  await page.getByTitle("Editar").first().click();
  await expect(page.getByRole("heading", { name: /JUJUY \(MEALLA\/ACHERAL\)/ })).toBeVisible();
  await expect(page.locator('input[name="sowingDate1"]')).toBeVisible();
  await expect(page.locator('input[name="variety"]')).toBeVisible();
});
