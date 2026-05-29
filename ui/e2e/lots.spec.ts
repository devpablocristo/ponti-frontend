import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

// Columnas de comercialización (montos "u$ …"). Se usan para derivar las aserciones
// de dinero desde la respuesta real en vez de hardcodear un valor del snapshot.
const MONEY_FIELDS = [
  "income_net_per_ha",
  "rent_per_ha",
  "admin_cost",
  "active_total_per_ha",
  "operating_result_per_ha",
] as const;

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

  // La paginación de Lotes es client-side: el endpoint devuelve el array completo
  // (SuccessResponse<Payload> -> { data: { data: LotsData[], page_info } }) y la tabla
  // lo pagina de a 10. Derivamos todo lo entity-level de esta respuesta.
  const body = await (await lotsResponse).json();
  const lots: Array<Record<string, unknown>> = Array.isArray(body?.data)
    ? body.data
    : body?.data?.data ?? [];
  const total = lots.length;
  const perPage = 10;
  expect(total, "project 30 debería tener al menos un lote en los datos cargados").toBeGreaterThan(0);

  await expect(page.getByRole("heading", { name: "Lotes" })).toBeVisible();
  // Primer lote de la página 1 = primer elemento en el orden de respuesta (sin sort).
  await expect(page.getByText(String(lots[0].lot_name)).first()).toBeVisible();
  const end1 = Math.min(perPage, total);
  await expect(
    page.getByText(new RegExp(`Mostrar\\s*1-${end1}\\s*de\\s*${total}`))
  ).toBeVisible();

  await page.getByRole("button", { name: "Comercialización" }).click();
  const tableHead = page.locator("thead");
  await expect(tableHead.getByText("Ingreso Neto")).toBeVisible();
  await expect(tableHead.getByText("Arriendo")).toBeVisible();
  await expect(tableHead.getByText("Activo Total")).toBeVisible();
  await expect(tableHead.getByText("Resultado Operativo")).toBeVisible();
  // Las celdas de comercialización renderizan montos "u$ …" (derivado, no un valor fijo).
  await expect(page.getByText(/u\$\s*-?[\d.,]+/).first()).toBeVisible();
  // Si algún lote de la página 1 tiene un monto negativo, debe renderizarse con signo.
  const page1 = lots.slice(0, perPage);
  const hasNegative = page1.some((lot) =>
    MONEY_FIELDS.some((field) => Number(lot[field]) < 0)
  );
  if (hasNegative) {
    await expect(page.getByText(/u\$\s*-[\d.,]+/).first()).toBeVisible();
  }

  // Página 2: solo si hay más lotes que una página (gate sobre el total derivado).
  if (total > perPage) {
    await page.getByRole("button", { name: "2" }).click();
    const start2 = perPage + 1;
    const end2 = Math.min(perPage * 2, total);
    await expect(
      page.getByText(new RegExp(`Mostrar\\s*${start2}-${end2}\\s*de\\s*${total}`))
    ).toBeVisible();
    // Primer lote de la página 2 = elemento en el índice perPage del array.
    await expect(page.getByText(String(lots[perPage].lot_name)).first()).toBeVisible();
  }

  await page.getByTitle("Editar").first().click();
  // project_id=30 está fijado por el auth helper, así que project_name es el del workspace.
  await expect(
    page.getByRole("heading", { name: /JUJUY \(MEALLA\/ACHERAL\)/ })
  ).toBeVisible();
  await expect(page.locator('input[name="sowingDate1"]')).toBeVisible();
  await expect(page.locator('input[name="variety"]')).toBeVisible();
});
