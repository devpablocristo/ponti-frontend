import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

import { installAuthenticatedSession } from "./helpers/auth";

const phase = process.env.DRAWER_AUDIT_PHASE ?? "after";
const outDir = `../docs/audit/drawers/${phase}`;

type DrawerScenario = {
  id: string;
  route: string;
  title: string | RegExp;
  open: (page: Page) => Promise<void>;
};

async function waitForApp(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
}

async function closeDrawer(page: Page) {
  const close = page.locator(".drawer-close, .drawer-close-button").last();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(250);
  }
}

const scenarios: DrawerScenario[] = [
  {
    id: "lots-edit",
    route: "/admin/lots",
    title: /LOTE|Nuevo lote/,
    open: async (page) => {
      await page
        .getByRole("checkbox", { name: /Seleccionar lote/i })
        .first()
        .check();
      await page
        .getByRole("toolbar", { name: "Acciones masivas" })
        .getByRole("button", { name: "Editar" })
        .click();
    },
  },
  {
    id: "lots-archived",
    route: "/admin/lots",
    title: "Lotes archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "products-new",
    route: "/admin/products",
    title: /Ingreso de Insumo|Editar Insumo/,
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo" }).click();
    },
  },
  {
    id: "products-archived",
    route: "/admin/products",
    title: "Movimientos archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "tasks-new",
    route: "/admin/tasks",
    title: "Nueva Labor",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo" }).click();
    },
  },
  {
    id: "tasks-archived",
    route: "/admin/tasks",
    title: "Labores archivadas",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "workorders-new",
    route: "/admin/work-orders",
    title: "Nueva Orden de Trabajo",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo" }).click();
    },
  },
  {
    id: "workorders-archived",
    route: "/admin/work-orders",
    title: "Órdenes archivadas",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "stock-new",
    route: "/admin/stock",
    title: "Ingreso de Stock",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo" }).click();
    },
  },
  {
    id: "customers-new",
    route: "/admin/database/customers/list",
    title: "Nuevo Cliente",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo", exact: true }).click();
    },
  },
  {
    id: "customers-archived",
    route: "/admin/database/customers/list",
    title: "Clientes archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "database-items-new",
    route: "/admin/database/items/list",
    title: /Nuevo insumo|Completar insumo pendiente|Edicion de insumo/,
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo Insumo" }).click();
    },
  },
  {
    id: "database-tasks-new",
    route: "/admin/database/tasks/list",
    title: /Nueva Labor|Edicion de labor/,
    open: async (page) => {
      await page.getByRole("button", { name: "Nueva Labor" }).click();
    },
  },
  {
    id: "actors-new",
    route: "/admin/database/actors",
    title: "Nuevo actor",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo" }).click();
    },
  },
  {
    id: "actors-archived",
    route: "/admin/database/actors",
    title: "Actores archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "investors-new",
    route: "/admin/database/investors/create",
    title: "Nuevo inversor",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo Inversor" }).click();
    },
  },
  {
    id: "investors-archived",
    route: "/admin/database/investors/create",
    title: "Inversores archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "managers-new",
    route: "/admin/database/managers/create",
    title: "Nuevo responsable",
    open: async (page) => {
      await page.getByRole("button", { name: "Nuevo Responsable" }).click();
    },
  },
  {
    id: "managers-archived",
    route: "/admin/database/managers/create",
    title: "Responsables archivados",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
  {
    id: "campaigns-new",
    route: "/admin/database/campaigns/create",
    title: "Nueva campaña",
    open: async (page) => {
      await page.getByRole("button", { name: "Nueva Campaña", exact: true }).click();
    },
  },
  {
    id: "campaigns-archived",
    route: "/admin/database/campaigns/create",
    title: "Campañas archivadas",
    open: async (page) => {
      await page.getByRole("button", { name: "Archivados" }).click();
    },
  },
];

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test.describe.configure({ mode: "parallel" });

for (const scenario of scenarios) {
  test(`drawer audit screenshot: ${scenario.id}`, async ({ page }) => {
    test.setTimeout(35_000);
    fs.mkdirSync(outDir, { recursive: true });
    page.setDefaultTimeout(8_000);

    try {
      await page.goto(scenario.route);
      await waitForApp(page);
      await scenario.open(page);
      await page.locator(".drawer-panel, .drawer-shell").last().waitFor({
        state: "visible",
        timeout: 8_000,
      });
      await expect(page.getByRole("heading", { name: scenario.title })).toBeVisible({
        timeout: 2_000,
      });
      await page.screenshot({
        path: `${outDir}/${scenario.id}.png`,
        fullPage: true,
      });
      await closeDrawer(page);
    } catch (error) {
      const message = String(error);
      fs.writeFileSync(`${outDir}/${scenario.id}.failure.txt`, message);
      await page
        .screenshot({
          path: `${outDir}/${scenario.id}.failed.png`,
          fullPage: true,
        })
        .catch(() => undefined);
      if (process.env.DRAWER_AUDIT_STRICT === "1") {
        throw error;
      }
    }
  });
}
