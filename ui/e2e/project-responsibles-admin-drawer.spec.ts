import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

const actors = [
  { id: 201, display_name: "AGRO LAJITAS 25-26", roles: ["cliente"] },
  { id: 101, display_name: "GERO", roles: ["responsable"] },
  { id: 102, display_name: "NICO", roles: ["responsable"] },
  { id: 301, display_name: "OLEGA SA", roles: ["inversor"] },
];

const projectSummary = {
  id: 10,
  name: "Jujuy Mealla Acheral",
  customer: "Agro Lajitas 25-26",
  campaign: "2025-2026",
  managers: "Gero",
  investors: "Olega SA - 40%",
  fields: [{ name: "Campo Norte", lease_type: "Arrendamiento", hectares: "100", crops: "Maíz" }],
};

const projectDetail = {
  name: "Jujuy Mealla Acheral",
  customer: { id: 7, actor_id: 201, name: "Agro Lajitas 25-26" },
  campaign: { id: 5, name: "2025-2026" },
  managers: [{ id: 3, actor_id: 101, name: "Gero" }],
  investors: [{ id: 8, actor_id: 301, name: "Olega SA", percentage: 40 }],
  admin_cost_investors: [],
  admin_cost: 0,
  planned_cost: 0,
  fields: [
    {
      id: 20,
      name: "Campo Norte",
      lease_type_id: 1,
      lease_type_name: "Arrendamiento",
      lease_type_percent: null,
      lease_type_value: null,
      investors: [],
      lots: [
        {
          id: 30,
          name: "Lote 1",
          hectares: 50,
          previous_crop_id: 1,
          previous_crop_name: "Soja",
          current_crop_id: 2,
          current_crop_name: "Maíz",
          season: "Verano",
        },
      ],
    },
  ],
  updated_at: "2026-01-01T00:00:00Z",
};

async function mockProjectEditorApis(page: Page) {
  await page.route("**/api/v1/customers?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: [{ id: 7, actor_id: 201, name: "AGRO LAJITAS 25-26" }], total: 1 },
      }),
    });
  });

  await page.route("**/api/v1/actors?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: actors, total: actors.length } }),
    });
  });

  await page.route("**/api/v1/managers?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          data: [
            { id: 3, actor_id: 101, name: "Gero" },
            { id: 4, actor_id: 102, name: "Nico" },
          ],
          total: 2,
        },
      }),
    });
  });

  await page.route("**/api/v1/investors?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { data: [{ id: 8, actor_id: 301, name: "Olega SA" }], total: 1 },
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

  await page.route("**/api/v1/projects/10**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: projectDetail }),
    });
  });

  await page.route("**/api/v1/projects?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [projectSummary], total: 1 } }),
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
      body: JSON.stringify({
        success: true,
        data: { data: [{ id: 20, name: "Campo Norte", project_id: 10 }], total: 1 },
      }),
    });
  });

  await page.route("**/api/v1/crops**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Soja" },
          { id: 2, name: "Maíz" },
          { id: 3, name: "Trigo" },
        ],
      }),
    });
  });

  await page.route("**/api/v1/lots**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          data: [
            {
              id: 31,
              project_id: 10,
              field_id: 20,
              project_name: "Jujuy Mealla Acheral",
              field_name: "Campo Norte",
              lot_name: "Lote 2",
              previous_crop: "Soja",
              previous_crop_id: 1,
              current_crop: "Trigo",
              current_crop_id: 3,
              variety: "",
              hectares: "25",
              sowed_area: "0",
              harvested_area: "0",
              dates: [],
              tons: "0",
              yield_tn_per_ha: "0",
              income_net_per_ha: "0",
              cost_usd_per_ha: "0",
              rent_per_ha: "0",
              admin_cost: "0",
              active_total_per_ha: "0",
              operating_result_per_ha: "0",
              season: "Invierno",
            },
          ],
          page_info: { page: 1, per_page: 1000, max_page: 1, total: 1 },
        },
      }),
    });
  });

  await page.route("**/api/v1/form-options**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { rentTypes: [] } }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
  await mockProjectEditorApis(page);
});

test("administrador de responsables embebido selecciona sin perder estado del proyecto", async ({
  page,
}) => {
  await page.goto("/admin/master-data/projects/list");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).toBeVisible();

  await page.getByLabel("Cliente / Sociedad").fill("Agro Lajitas 25-26");
  await page.getByLabel("Nombre del proyecto").fill("Jujuy Mealla Acheral");
  await page.getByRole("combobox", { name: "Campaña" }).fill("2025-2026");

  await page.getByRole("button", { name: "Administrar", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Administrar Responsables" })).toBeVisible();
  const adminDrawer = page.getByRole("dialog", { name: "Administrar Responsables" });
  await expect(adminDrawer.getByRole("button", { name: "Duplicados" })).toHaveCount(0);
  await expect(adminDrawer.getByRole("button", { name: "Importar" })).toHaveCount(0);
  await expect(adminDrawer.getByRole("button", { name: "Exportar" })).toHaveCount(0);
  await expect(adminDrawer.getByRole("button", { name: "Agregar" })).toHaveCount(1);
  await expect(adminDrawer.getByRole("button", { name: "Usar en Proyecto" })).toHaveCount(0);
  await expect(adminDrawer.getByText("Contexto Heredado")).toHaveCount(0);
  await expect(adminDrawer.getByLabel("Rol")).toHaveCount(0);
  const adminDrawerTop = await adminDrawer.evaluate((element) => element.getBoundingClientRect().top);
  expect(adminDrawerTop).toBeLessThanOrEqual(1);
  await expect(adminDrawer.getByRole("button", { name: "Proyecto Actual" })).toBeVisible();
  await expect(adminDrawer.getByRole("button", { name: "Todos", exact: true })).toBeVisible();

  await expect(page.getByRole("cell", { name: "Gero", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Nico", exact: true })).toHaveCount(0);

  const geroRow = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "Gero", exact: true }),
  });
  await geroRow.getByRole("checkbox").check();
  await adminDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("heading", { name: "Administrar Responsables" })).toHaveCount(0);
  await expect(page.getByLabel("Nombre del proyecto")).toHaveValue("Jujuy Mealla Acheral");
  await expect(page.getByRole("combobox", { name: "Campaña" })).toHaveValue("2025-2026");
  await expect(page.getByLabel("Responsable 1")).toHaveValue("Gero");
});

test("administradores embebidos agregan inversor, campo y lote sin perder estado", async ({
  page,
}) => {
  await page.goto("/admin/master-data/projects/list");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevo Proyecto" })).toBeVisible();

  await page.getByLabel("Cliente / Sociedad").fill("Agro Lajitas 25-26");
  await page.getByLabel("Nombre del proyecto").fill("Jujuy Mealla Acheral");
  await page.getByRole("combobox", { name: "Campaña" }).fill("2025-2026");

  await page.getByRole("button", { name: "Administrar", exact: true }).nth(1).click();
  const investorsDrawer = page.getByRole("dialog", { name: "Administrar Inversores" });
  await expect(investorsDrawer).toBeVisible();
  await expect(investorsDrawer.getByRole("button", { name: "Importar" })).toHaveCount(0);
  await expect(investorsDrawer.getByRole("button", { name: "Exportar" })).toHaveCount(0);
  await investorsDrawer.getByRole("checkbox", { name: "Seleccionar inversor Olega SA" }).check();
  await investorsDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("heading", { name: "Administrar Inversores" })).toHaveCount(0);
  await expect(page.locator('input[value="Olega SA"]').first()).toBeVisible();
  await expect(page.getByLabel("Nombre del proyecto")).toHaveValue("Jujuy Mealla Acheral");

  await page.getByRole("button", { name: "Administrar", exact: true }).nth(3).click();
  const fieldsDrawer = page.getByRole("dialog", { name: "Administrar Campos" });
  await expect(fieldsDrawer).toBeVisible();
  await fieldsDrawer.getByRole("checkbox", { name: "Seleccionar campo Campo Norte" }).check();
  await fieldsDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("heading", { name: "Administrar Campos" })).toHaveCount(0);
  await expect(page.locator('input[value="Campo Norte"]').first()).toBeVisible();
  await expect(page.locator('input[value="Lote 1"]').first()).toBeVisible();
  await expect(page.locator('input[value="Maiz"]').first()).toBeVisible();

  await page.getByRole("button", { name: "Administrar Lotes" }).nth(1).click();
  const lotsDrawer = page.getByRole("dialog", { name: "Administrar Lotes" });
  await expect(lotsDrawer).toBeVisible();
  await lotsDrawer.getByRole("checkbox", { name: "Seleccionar lote Lote 2" }).check();
  await lotsDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByRole("heading", { name: "Administrar Lotes" })).toHaveCount(0);
  await expect(page.locator('input[value="Lote 2"]').first()).toBeVisible();
  await expect(page.locator('input[value="Trigo"]').first()).toBeVisible();

  await page.getByRole("button", { name: "Administrar Cultivos" }).nth(1).click();
  const cropsDrawer = page.getByRole("dialog", { name: "Administrar Cultivos" });
  await expect(cropsDrawer).toBeVisible();
  await expect(cropsDrawer.getByRole("button", { name: "Importar" })).toHaveCount(0);
  await expect(cropsDrawer.getByRole("button", { name: "Exportar" })).toHaveCount(0);
  await expect(cropsDrawer.getByText("Trigo")).toBeVisible();
});
