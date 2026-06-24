import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

const supplyName = "2-4D ESTER DEFERON ETIL EXIL X 20 LTS";

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("stock muestra insumos del proyecto", async ({ page }) => {
  const stockResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/stock/30") &&
      response.ok()
  );

  await page.goto("/admin/stock");
  await stockResponse;

  await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
  await expect(page.getByRole("button", { name: supplyName })).toBeVisible();
});

test("ordenes respeta filtro por insumo y conserva paginacion server-side", async ({ page }) => {
  // Cargamos el origen primero para poblar el token del auth helper (localStorage) y poder
  // consultar la API con el mismo bearer que usa la app.
  await page.goto("/admin/work-orders?project_id=30");
  const origin = new URL(page.url()).origin;
  const token = await page.evaluate(() =>
    localStorage.getItem(`ponti:${location.host}:access_token`)
  );
  const apiGet = async (path: string) => {
    const res = await page.request.get(`${origin}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    expect(res.ok(), `GET ${path} respondió ${res.status()}`).toBeTruthy();
    return res.json();
  };

  // Descubrimos, desde los datos reales, un insumo que efectivamente tenga órdenes en
  // project 30 (en vez del supply_id=549 fijo, que dejó de tener órdenes tras el reset).
  const stock = await apiGet("/stock/30?cutoff_date=");
  const items = (stock?.data?.items ?? []) as Array<{
    supply_id: number;
    supply_name: string;
    consumed: number;
  }>;
  const candidates = items
    .filter((item) => item.supply_id && Number(item.consumed) > 0)
    .sort((a, b) => Number(b.consumed) - Number(a.consumed));

  let chosen: { supply_id: number; supply_name: string } | null = null;
  for (const candidate of candidates.slice(0, 15)) {
    // El endpoint exige el workspace completo (customer_id+campaign_id+project_id), igual
    // que lo manda la UI desde el workspace seleccionado. project 30 → customer 17, campaign 2.
    const wo = await apiGet(
      `/work-orders?customer_id=17&campaign_id=2&project_id=30&supply_id=${candidate.supply_id}&page=1&per_page=10`
    );
    const total = Number(wo?.data?.page_info?.total ?? 0);
    if (total >= 1) {
      chosen = { supply_id: candidate.supply_id, supply_name: candidate.supply_name };
      if (total >= 11) break; // suficientes órdenes para llenar la primera página
    }
  }

  test.skip(
    !chosen,
    "ningún insumo de project 30 tiene órdenes asociadas en los datos actuales"
  );
  const supplyId = chosen!.supply_id;
  const chosenName = chosen!.supply_name;

  // Navegamos con el insumo descubierto e interceptamos la respuesta filtrada server-side.
  const ordersResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders?") &&
      response.url().includes("project_id=30") &&
      response.url().includes(`supply_id=${supplyId}`) &&
      response.ok()
  );

  await page.goto(
    `/admin/work-orders?project_id=30&supply_id=${supplyId}&supply_name=${encodeURIComponent(chosenName)}`
  );
  const body = await (await ordersResponse).json();
  const expectedTotal = Number(body?.data?.page_info?.total ?? 0);
  const expectedEnd = Math.min(10, expectedTotal);

  await expect(page.getByRole("heading", { name: "Órdenes de Trabajo" })).toBeVisible();
  const supplyFilterBanner = page
    .locator("div")
    .filter({ hasText: "Filtrando órdenes que consumen:" })
    .first();
  await expect(supplyFilterBanner).toBeVisible();
  await expect(supplyFilterBanner).toContainText(chosenName);
  await expect(page.getByText("Cantidad de Órdenes Ingresadas")).toBeVisible();
  // Paginación derivada del total real (server-side) en vez de "1-10 de N" fijo.
  await expect(
    page.getByText(new RegExp(`Mostrar\\s*1-${expectedEnd}\\s*de\\s*${expectedTotal}`))
  ).toBeVisible();
});

test("ordenes muestra opciones de filtros de todo el proyecto, no solo de la pagina actual", async ({ page }) => {
  const firstPageResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders?") &&
      response.url().includes("project_id=30") &&
      response.url().includes("per_page=10") &&
      response.ok()
  );
  const filterDatasetResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/work-orders/filter-rows?") &&
      response.url().includes("project_id=30") &&
      response.ok()
  );

  await page.goto("/admin/work-orders?project_id=30");
  await firstPageResponse;
  const response = await filterDatasetResponse;
  const payload = await response.json();
  expect(
    (payload.data.rows as Array<{ project_name: string }>).every((row) =>
      row.project_name.includes("JUJUY")
    )
  ).toBe(true);

  await page
    .getByRole("columnheader", { name: /Lote/ })
    .getByRole("button", { name: "Filtrar" })
    .click();
  await page.getByPlaceholder("Buscar opción...").fill("LOTE 1");

  await expect(page.getByText("LOTE 1", { exact: true })).toBeVisible();
});
