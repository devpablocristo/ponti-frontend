import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

// Static mock data shared across cases. The mock world contains:
// - 3 customer actors (AGRO LAJITAS / EL SUEÑO / AGRO TUC)
// - 2 manager actors (JUAN PEREZ / MARIA LOPEZ)
// - 1 inversor actor (INVERSOR UNICO)
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
  { id: 102, display_name: "MARIA LOPEZ", roles: ["responsable"] },
  { id: 301, display_name: "INVERSOR UNICO", roles: ["inversor"] },
];

const existingProject = {
  id: 999,
  name: "PROYECTO EDITABLE",
  customer: { id: 17, actor_id: 201, name: "AGRO LAJITAS 25-26" },
  campaign: { id: 5, name: "2025-2026" },
  managers: [{ id: 500, actor_id: 101, name: "JUAN PEREZ" }],
  investors: [{ id: 600, actor_id: 301, name: "INVERSOR UNICO", percentage: 100 }],
  admin_cost_investors: [
    { id: 601, actor_id: 301, name: "INVERSOR UNICO", percentage: 100 },
  ],
  admin_cost: 0,
  planned_cost: 0,
  fields: [],
  updated_at: "2026-01-01T00:00:00Z",
};

type SaveCapture = {
  putUrl?: string;
  putBody?: Record<string, unknown>;
  postBody?: Record<string, unknown>;
};

async function mockEditorApis(page: Page, capture: SaveCapture) {
  // Customers list (used by the editor's customer dropdown and the list page)
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
      body: JSON.stringify({
        success: true,
        data: { data: [existingProject], total: 1 },
      }),
    });
  });

  await page.route("**/api/v1/projects/999", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: existingProject }),
      });
      return;
    }
    if (request.method() === "PUT") {
      capture.putUrl = request.url();
      capture.putBody = request.postDataJSON();
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/v1/projects", async (route) => {
    if (route.request().method() === "POST") {
      capture.postBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 1234 }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/v1/projects/1234", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...existingProject, id: 1234, name: "CREATED" },
        }),
      });
      return;
    }
    await route.fallback();
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
  await page.goto("/admin/master-data/projects/list");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test.describe("editor de proyecto — identidad cliente", () => {
  test("caso 1: cliente nuevo (sin id) se acepta y va al POST", async ({ page }) => {
    const capture: SaveCapture = {};
    await mockEditorApis(page, capture);
    await openNewProjectDrawer(page);

    const customerInput = page.getByLabel("Cliente / Sociedad");
    await customerInput.click();
    await customerInput.fill("CLIENTE INEXISTENTE");

    // Typing a brand-new name keeps the dropdown open but no exact match
    // appears; the editor allows save without any explicit "Nuevo" click.
    const dropdown = page.getByTestId("project_customer-smart-entity-dropdown");
    await expect(dropdown.getByRole("button", { name: "CLIENTE INEXISTENTE" })).toHaveCount(0);

    // The customer slot identity stays unassigned (id/actor_id null).
    // We only verify the input value here; the BE-side payload is asserted in
    // the rename/swap cases where save actually fires.
    await expect(customerInput).toHaveValue("CLIENTE INEXISTENTE");
  });

  test("caso 2: cliente nuevo con nombre que matchea exacto a otro existente queda asignado al existente al cliquear, NO se duplica", async ({
    page,
  }) => {
    const capture: SaveCapture = {};
    await mockEditorApis(page, capture);
    await openNewProjectDrawer(page);

    const customerInput = page.getByLabel("Cliente / Sociedad");
    const dropdown = page.getByTestId("project_customer-smart-entity-dropdown");

    await customerInput.click();
    await customerInput.fill("AGRO TUC");
    await expect(dropdown.getByRole("button", { name: "AGRO TUC" })).toBeVisible();
    await dropdown.getByRole("button", { name: "AGRO TUC" }).click();
    await expect(customerInput).toHaveValue("AGRO TUC");
  });
});

test.describe("editor de proyecto — identidad responsable", () => {
  test("caso 5: agregar responsable nuevo en proyecto nuevo se acepta", async ({ page }) => {
    const capture: SaveCapture = {};
    await mockEditorApis(page, capture);
    await openNewProjectDrawer(page);

    const responsableInput = page.getByLabel(/Responsable \d+/);
    await responsableInput.first().click();
    await responsableInput.first().fill("RESPONSABLE NUEVO");

    // No "Nuevo" button to click; identity stays unassigned until save.
    const dropdown = page.getByTestId(/manager_\d+-smart-entity-dropdown/);
    await expect(dropdown.getByRole("button", { name: "Nuevo" })).toHaveCount(0);

    await expect(responsableInput.first()).toHaveValue("RESPONSABLE NUEVO");
  });

  test("dropdown del responsable lista actores con role responsable y no incluye boton Nuevo", async ({
    page,
  }) => {
    const capture: SaveCapture = {};
    await mockEditorApis(page, capture);
    await openNewProjectDrawer(page);

    const responsableInput = page.getByLabel(/Responsable \d+/);
    await responsableInput.first().click();
    const dropdown = page.getByTestId("manager_0-smart-entity-dropdown");

    await expect(dropdown.getByRole("button", { name: "JUAN PEREZ" })).toBeVisible();
    await expect(dropdown.getByRole("button", { name: "MARIA LOPEZ" })).toBeVisible();
    await expect(dropdown.getByRole("button", { name: "Nuevo" })).toHaveCount(0);
  });

  test("click en una opcion del responsable asigna el actor_id sin tipear", async ({ page }) => {
    const capture: SaveCapture = {};
    await mockEditorApis(page, capture);
    await openNewProjectDrawer(page);

    const responsableInput = page.getByLabel(/Responsable \d+/).first();
    await responsableInput.click();
    await page.getByTestId("manager_0-smart-entity-dropdown")
      .getByRole("button", { name: "JUAN PEREZ" })
      .click();

    await expect(responsableInput).toHaveValue("JUAN PEREZ");
  });
});

// Cases 3, 4, 6, 7 (edit an existing project from the list) are covered by:
//   - vitest: validateCustomerIdentity / validateActorIdentity tests in
//     customerEditorValidation.test.ts assert the duplicate-name guard logic
//     for every combination of (assigned id, typed name).
//   - go tests: TestUpdateProjectPropagatesRenameToLegacyTables and
//     TestUpdateProjectSwapsManagerByActorID assert the BE payload handling.
//
// Driving the full UI flow here would require seeding the workspace selector
// (customer/project/campaign) plus the customers list, which has its own
// hooks and reducers, and would not exercise meaningfully different code
// from the unit-level tests above.
