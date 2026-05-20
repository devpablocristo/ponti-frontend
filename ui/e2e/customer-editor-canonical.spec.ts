import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

// Snapshot of legacy DB data: uppercase / accented / punctuated names. The
// display layer must render this as title-case via formatProperName.
const customers = [
  { id: 17, actor_id: 201, name: "AGRO LAJITAS 25-26" },
  { id: 22, actor_id: 202, name: "EL SUEÑO 25-26" },
];

const actors = [
  { id: 201, display_name: "AGRO LAJITAS 25-26", roles: ["cliente"] },
  { id: 202, display_name: "EL SUEÑO 25-26", roles: ["cliente"] },
  { id: 101, display_name: "JUAN PEREZ", roles: ["responsable"] },
  { id: 301, display_name: "INVERSOR UNICO", roles: ["inversor"] },
];

async function mockEditorApis(page: Page) {
  await page.route("**/api/v1/customers?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: customers, total: customers.length },
      }),
    });
  });

  await page.route("**/api/v1/actors?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: actors, total: actors.length },
      }),
    });
  });

  await page.route("**/api/v1/projects/customers/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [] } }),
    });
  });

  await page.route("**/api/v1/projects?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
    });
  });

  await page.route("**/api/v1/campaigns**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: [{ id: 5, name: "2025-2026" }], total: 1 },
      }),
    });
  });

  await page.route("**/api/v1/fields**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
    });
  });

  await page.route("**/api/v1/crops**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/v1/lots**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], page_info: {} } }),
    });
  });

  await page.route("**/api/v1/form-options**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { lease_types: [] } }),
    });
  });
}

async function openNewProjectDrawer(page: Page) {
  await page.goto("/admin/database/projects/list");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("dropdown del cliente muestra nombres en title-case aunque la API devuelva MAYUSCULAS / acentos", async ({
  page,
}) => {
  await mockEditorApis(page);
  await openNewProjectDrawer(page);

  await page.getByLabel(/Cliente \/ Sociedad/).click();
  const dropdown = page.getByTestId("project_customer-smart-entity-dropdown");
  // "AGRO LAJITAS 25-26" → canonical "agro lajitas 25 26" → display "Agro Lajitas 25 26".
  // "EL SUEÑO 25-26" → canonical "el sueno 25 26" → display "El Sueno 25 26".
  await expect(dropdown.getByRole("button", { name: "Agro Lajitas 25 26" })).toBeVisible();
  await expect(dropdown.getByRole("button", { name: "El Sueno 25 26" })).toBeVisible();
});

test("dropdown del responsable formatea los actores (lowercase legacy / ALL CAPS legacy ambos)", async ({
  page,
}) => {
  await mockEditorApis(page);
  await openNewProjectDrawer(page);

  // The first manager slot is rendered by default. Click it to open the
  // dropdown sourced from /actors with role=responsable.
  await page.getByLabel(/Responsable 1/).click();
  const dropdown = page.getByTestId("manager_0-smart-entity-dropdown");
  // "JUAN PEREZ" → "Juan Perez".
  await expect(dropdown.getByRole("button", { name: "Juan Perez" })).toBeVisible();
});

test("dropdown del inversor canonicaliza acrónimos sin signos", async ({ page }) => {
  await mockEditorApis(page);
  await openNewProjectDrawer(page);

  await page.getByLabel(/Nombre$/).first().click();
  const dropdown = page.getByTestId("investor_0-smart-entity-dropdown");
  // "INVERSOR UNICO" → "Inversor Unico".
  await expect(dropdown.getByRole("button", { name: "Inversor Unico" })).toBeVisible();
});
