import { expect, test } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

/**
 * Verificación E2E de PR #104 (devpablocristo/ponti-frontend) — "table-select-filters".
 *
 * El fix de #104: los filtros tipo SELECT pasan de match por substring (.includes)
 * a match EXACTO normalizado (`matchesSelectFilter` en src/lib/tableFilters.ts,
 * usado por lotTableUtils.matchesFilterValue). Antes, elegir "Lote 1" en el
 * dropdown TAMBIÉN mostraba "Lote 10" porque "lote 10".includes("lote 1") === true.
 *
 * Este test ejerce la página real /admin/lots y aísla la lógica de filtrado del
 * frontend interceptando la API a nivel browser con datos controlados (sin BFF/
 * backend/DB). La aserción clave ("Lote 10" desaparece al filtrar por "Lote 1")
 * FALLARÍA con el código viejo de substring y PASA con el match exacto del #104.
 */

type LotRow = Record<string, unknown> & { id: number; lot_name: string };

function lot(id: number, lot_name: string, current_crop: string): LotRow {
  return {
    id,
    project_id: 30,
    field_id: 1,
    project_name: "JUJUY (MEALLA/ACHERAL)",
    field_name: "Campo Norte",
    lot_name,
    previous_crop: "Barbecho",
    previous_crop_id: 0,
    current_crop,
    current_crop_id: id,
    variety: "-",
    hectares: "100",
    sowed_area: "100",
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
    season: "2025-2026",
  };
}

// Nombres con colisión por substring: "Lote 1" es prefijo de "Lote 10".
const LOTS: LotRow[] = [
  lot(1, "Lote 1", "Trigo"),
  lot(2, "Lote 10", "Soja"),
  lot(3, "Lote 2", "Maiz"),
];

const KPIS = {
  seeded_area: "300",
  harvested_area: "0",
  yield_tn_per_ha: "0",
  cost_per_hectare: "0",
  superficie_total: "300",
  total_tons: "0",
};

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const body = (data: unknown) => ({ success: true, message: "ok", data });

    if (/\/lots\/(metrics|kpis)/.test(url)) {
      return route.fulfill({ json: body(KPIS) });
    }
    if (/\/lots(\?|$)/.test(url)) {
      return route.fulfill({
        json: body({
          data: LOTS,
          page_info: { per_page: 10, page: 1, max_page: 1, total: LOTS.length },
        }),
      });
    }
    if (/\/crops/.test(url)) {
      return route.fulfill({
        json: body([
          { id: 1, name: "Trigo" },
          { id: 2, name: "Soja" },
          { id: 3, name: "Maiz" },
        ]),
      });
    }
    // Catch-all: el shell (customers/projects/campaigns/fields) lee
    // response.data.data + response.data.total / page_info. Devolvemos un
    // envelope con lista vacía (la selección de workspace ya viene de localStorage).
    return route.fulfill({
      json: body({
        data: [],
        items: [],
        total: 0,
        page_info: { per_page: 10, page: 1, max_page: 1, total: 0 },
      }),
    });
  });
});

test("PR#104: filtro select hace match EXACTO ('Lote 1' no arrastra 'Lote 10')", async ({
  page,
}) => {
  await page.goto("/admin/lots");

  const tbody = page.locator("tbody");

  // Estado inicial: los 3 lotes están en la tabla.
  await expect(page.getByRole("heading", { name: "Lotes" })).toBeVisible();
  await expect(tbody.getByText("Lote 1", { exact: true })).toBeVisible();
  await expect(tbody.getByText("Lote 10", { exact: true })).toBeVisible();
  await expect(tbody.getByText("Lote 2", { exact: true })).toBeVisible();

  // Abrir el filtro de la columna "Lote" (key lot_name, filterType select).
  const loteHeader = page.getByRole("columnheader").filter({ hasText: "Lote" });
  await loteHeader.getByRole("button", { name: "Filtrar" }).click();

  // Tildar SOLO la opción exacta "Lote 1".
  await loteHeader.getByRole("checkbox", { name: "Lote 1", exact: true }).check();
  await loteHeader.getByRole("button", { name: "Aplicar" }).click();

  // Resultado del fix #104: en la tabla queda SOLO "Lote 1".
  // "Lote 10" desaparece (con el código viejo de substring habría seguido visible).
  await expect(tbody.getByText("Lote 1", { exact: true })).toBeVisible();
  await expect(tbody.getByText("Lote 10", { exact: true })).toHaveCount(0);
  await expect(tbody.getByText("Lote 2", { exact: true })).toHaveCount(0);
});
