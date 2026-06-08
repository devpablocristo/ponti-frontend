import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("crear labores carga el catalogo del proyecto sin error de Core", async ({ page }) => {
  const laborsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/projects/30/labors") &&
      response.ok()
  );

  await page.goto("/admin/database/tasks");
  const body = await (await laborsResponse).json();

  expect(Array.isArray(body?.data)).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Crear Labores" })).toBeVisible();
  await expect(page.getByText("failed to list labor")).toHaveCount(0);
});
