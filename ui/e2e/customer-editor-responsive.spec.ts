import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

// Mocks mínimos: el editor depende de múltiples endpoints (customers,
// actors, projects, campaigns, fields, crops, lots, form-options). Le damos
// respuestas vacías o de un solo item para que renderice sin errores.
async function mockEditorApis(page: Page) {
  const json = (body: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  await page.route("**/api/v1/customers?**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], total: 0 } })
    );
  });
  await page.route("**/api/v1/actors?**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], total: 0 } })
    );
  });
  await page.route("**/api/v1/projects/customers/**", async (route) => {
    await route.fulfill(json({ success: true, data: { data: [] } }));
  });
  await page.route("**/api/v1/projects?**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], total: 0 } })
    );
  });
  await page.route("**/api/v1/campaigns**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], total: 0 } })
    );
  });
  await page.route("**/api/v1/fields**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], total: 0 } })
    );
  });
  await page.route("**/api/v1/crops**", async (route) => {
    await route.fulfill(json({ success: true, data: [] }));
  });
  await page.route("**/api/v1/lots**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { data: [], page_info: {} } })
    );
  });
  await page.route("**/api/v1/form-options**", async (route) => {
    await route.fulfill(
      json({ success: true, data: { lease_types: [] } })
    );
  });
}

async function openEditor(page: Page) {
  await page.goto("/admin/master-data/customers/editor");
  // El header "Proyecto" indica que el editor terminó de cargar el bloque
  // de identidad. No verificamos cliente-only porque el default es project mode.
  await expect(
    page.getByRole("heading", { name: "Proyecto" }).first()
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Asserta que el elemento no provoca scroll horizontal en el viewport.
 * Tolerancia de 2px por subpixel rendering.
 */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test.describe("editor de proyecto — responsive", () => {
  test("mobile (375x667) renderiza sin scroll horizontal y stackea secciones", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockEditorApis(page);
    await openEditor(page);

    // Sin scroll horizontal: si lo hay, algún elemento se desbordó del viewport.
    await expectNoHorizontalScroll(page);

    // Las 3 secciones principales del editor deben renderizar y ser visibles.
    await expect(
      page.getByRole("heading", { name: "Proyecto" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Campos" }).first()
    ).toBeVisible();

    // Los inputs principales no quedan ocultos por overflow.
    await expect(page.getByLabel(/Cliente \/ Sociedad/)).toBeVisible();
    await expect(page.getByLabel(/Nombre del proyecto/)).toBeVisible();
  });

  test("desktop (1280x800) renderiza sin overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockEditorApis(page);
    await openEditor(page);

    await expectNoHorizontalScroll(page);
    await expect(page.getByLabel(/Cliente \/ Sociedad/)).toBeVisible();
    await expect(page.getByLabel(/Nombre del proyecto/)).toBeVisible();
  });

  test("tablet vertical (768x1024) renderiza sin overflow", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockEditorApis(page);
    await openEditor(page);

    await expectNoHorizontalScroll(page);
    await expect(page.getByLabel(/Cliente \/ Sociedad/)).toBeVisible();
  });
});
