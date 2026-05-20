import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

const customers = [
  { id: 17, actor_id: 201, name: "AGRO LAJITAS 25-26" },
  { id: 22, actor_id: 202, name: "EL SUEÑO 25-26" },
  { id: 31, actor_id: 203, name: "AGRO TUC" },
];

const actors = [
  { id: 201, display_name: "AGRO LAJITAS 25-26", roles: ["cliente"] },
  { id: 202, display_name: "EL SUEÑO 25-26", roles: ["cliente"] },
  { id: 203, display_name: "AGRO TUC", roles: ["cliente"] },
  { id: 101, display_name: "JUAN PEREZ", roles: ["responsable"] },
  { id: 102, display_name: "SOLEDAD GOMEZ", roles: ["inversor"] },
  { id: 103, display_name: "LA ARRENDATARIA SRL", roles: ["arrendatario"] },
];

async function mockCustomerEditorApis(page: Page, options: { failActors?: boolean } = {}) {
  await page.route("**/api/v1/customers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: customers, total: customers.length },
      }),
    });
  });

  await page.route("**/api/v1/actors**", async (route) => {
    if (options.failActors) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "actors failed" }),
      });
      return;
    }

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
      body: JSON.stringify({ success: true, data: { data: [] } }),
    });
  });

  await page.route("**/api/v1/campaigns**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
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
      body: JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "SOJA" },
          { id: 2, name: "MAIZ" },
        ],
      }),
    });
  });

  await page.route("**/api/v1/lots**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], page_info: {} } }),
    });
  });
}

async function openNewCustomerDrawer(page: Page) {
  await page.goto("/admin/database/projects/list");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("cliente/sociedad muestra lista completa, filtra y selecciona", async ({ page }) => {
  await mockCustomerEditorApis(page);
  await openNewCustomerDrawer(page);

  const customerInput = page.getByLabel("Cliente / Sociedad");
  const dropdown = page.getByTestId("project_customer-smart-entity-dropdown");

  await customerInput.click();
  // Mock data uses legacy uppercase / accented names ("AGRO LAJITAS 25-26",
  // "EL SUEÑO 25-26"). The dropdown renders them title-cased via
  // formatProperName ("Agro Lajitas 25 26" / "El Sueno 25 26").
  await expect(dropdown.getByRole("button", { name: "Agro Lajitas 25 26" })).toBeVisible();
  await expect(dropdown.getByRole("button", { name: "El Sueno 25 26" })).toBeVisible();
  // After the editor refactor the explicit "Nuevo" action no longer lives in
  // the dropdown — creation is implicit when the typed name has no match.
  await expect(dropdown.getByRole("button", { name: "Nuevo" })).toHaveCount(0);

  await dropdown.getByRole("button", { name: "Agro Lajitas 25 26" }).click();
  // Selecting an existing option commits the raw (legacy) name to the input
  // so the editor can match against the source dataset.
  await expect(customerInput).toHaveValue("AGRO LAJITAS 25-26");

  await customerInput.click();
  await customerInput.fill("sueno");
  await expect(dropdown.getByRole("button", { name: "El Sueno 25 26" })).toBeVisible();
  await expect(dropdown.getByRole("button", { name: "Agro Lajitas 25 26" })).not.toBeVisible();

  await customerInput.fill("AGRO TUC");
  await expect(dropdown.getByRole("button", { name: "Agro Tuc" })).toBeVisible();
});

test("fallo de actores no rompe la lista de clientes", async ({ page }) => {
  await mockCustomerEditorApis(page, { failActors: true });
  await openNewCustomerDrawer(page);

  const dropdown = page.getByTestId("project_customer-smart-entity-dropdown");
  await page.getByLabel("Cliente / Sociedad").click();

  await expect(dropdown.getByRole("button", { name: "Agro Lajitas 25 26" })).toBeVisible();
});
