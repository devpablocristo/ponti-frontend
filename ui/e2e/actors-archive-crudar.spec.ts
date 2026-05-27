import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const actorRow = {
  id: 1,
  actor_kind: "organization",
  display_name: "Agro Lajitas",
  roles: ["cliente"],
  identifiers: [],
  aliases: [],
  primary_email: null,
  primary_phone: null,
};

const customerRow = {
  id: 17,
  actor_id: 1,
  name: "Agro Lajitas",
};

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createE2EToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      sub: "actors-crudar-e2e",
      ID: 1,
      Rol: 1,
      Username: "Actors CRUDAR E2E",
      Hash: "e2e",
      exp,
    }),
    "",
  ].join(".");
}

async function installMockSession(page: Page) {
  const token = createE2EToken();
  await page.addInitScript(
    ({ e2eToken }) => {
      const prefix = `ponti:${window.location.host}:`;
      localStorage.setItem(`${prefix}access_token`, e2eToken);
      localStorage.setItem(`${prefix}refresh_token`, e2eToken);
      localStorage.setItem("ponti:tenant_id", "default");
      localStorage.setItem("tenant_id", "default");
    },
    { e2eToken: token }
  );
}

async function mockActorsApis(
  page: Page,
  counters: { customerArchive: number; actorArchive: number }
) {
  let archived = false;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path.endsWith("/me/context")) {
      await route.fulfill(
        json({
          current_tenant_id: "default",
          tenants: [{ id: "default", name: "Default" }],
        })
      );
      return;
    }

    if (method === "GET" && path.endsWith("/actors")) {
      await route.fulfill(
        json({
          success: true,
          data: { data: archived ? [] : [actorRow], total: archived ? 0 : 1 },
        })
      );
      return;
    }

    if (method === "GET" && path.endsWith("/customers")) {
      await route.fulfill(
        json({
          success: true,
          data: { data: archived ? [] : [customerRow], total: archived ? 0 : 1 },
        })
      );
      return;
    }

    if (method === "POST" && path.endsWith(`/customers/${customerRow.id}/archive`)) {
      counters.customerArchive += 1;
      archived = true;
      await route.fulfill(json({ success: true, data: "archived" }));
      return;
    }

    if (method === "POST" && path.endsWith(`/actors/${actorRow.id}/archive`)) {
      counters.actorArchive += 1;
      await route.fulfill(json({ success: false, message: "actor archive should not be called" }));
      return;
    }

    if (method === "GET" && (path.endsWith("/managers") || path.endsWith("/investors"))) {
      await route.fulfill(json({ success: true, data: { data: [], total: 0 } }));
      return;
    }

    await route.fulfill(json({ success: true, data: { data: [], total: 0 } }));
  });
}

test.beforeEach(async ({ page }) => {
  await installMockSession(page);
});

test("archiva un actor cliente usando customers CRUDAR", async ({ page }) => {
  const counters = { customerArchive: 0, actorArchive: 0 };
  await mockActorsApis(page, counters);

  await page.goto("/admin/master-data/actors/clientes");
  await expect(page.getByText("Agro Lajitas")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("checkbox", { name: /Seleccionar cliente Agro Lajitas/i }).check();
  await page
    .getByRole("toolbar", { name: "Acciones masivas" })
    .getByRole("button", { name: "Archivar 1" })
    .click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect.poll(() => counters.customerArchive).toBe(1);
  expect(counters.actorArchive).toBe(0);
  await expect(page.getByText("Se archivaron 1 clientes.")).toBeVisible();
  await expect(page.getByText("Aún no hay actores")).toBeVisible();
});
