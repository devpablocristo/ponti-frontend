import { expect, test, type Page, type Locator } from "@playwright/test";

import { installAuthenticatedSession } from "./helpers/auth";

// Normalización de fecha igual a ui/src/pages/admin/utils.ts (normalizeDate):
// "DD/MM/YYYY" -> "YYYY-MM-DD" y "...T..." (ISO) -> "YYYY-MM-DD".
function normalizeDate(value: string): string {
  if (!value) return "";
  return value.includes("/") ? value.split("/").reverse().join("-") : value.split("T")[0];
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

// El popover de filtro de LocalDataTable se monta vía portal en document.body con z-[9999].
// Acotamos todas las queries a él para no chocar con la tabla ni con el FilterBar de la página.
function filterPopover(page: Page): Locator {
  // El popover de filtro es `div.fixed z-[9999] ...`; el menú de usuario del header
  // también usa z-[9999] pero es `div.absolute ... hidden`, así que filtramos por `.fixed`.
  return page.locator('div.fixed[class*="z-[9999]"]');
}

async function openColumnFilter(page: Page, headerName: RegExp) {
  await page
    .getByRole("columnheader", { name: headerName })
    .getByRole("button", { name: /Filtr/ }) // "Filtrar" | "Filtro activo"
    .first()
    .click();
  await expect(filterPopover(page)).toBeVisible();
}

// REGRESIÓN H1: en Products, con un filtro de Fecha activo, el resto de las columnas
// deben seguir ofreciendo opciones. Antes del fix, getFilterOptionsForColumn no
// normalizaba entry_date (sufijo de hora) y el match exacto vaciaba TODAS las opciones
// de las demás columnas ("Sin resultados").
test("products: con filtro de fecha activo, otra columna sigue mostrando opciones (H1)", async ({
  page,
}) => {
  const movementsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/supply_movements/30") &&
      response.ok()
  );

  await page.goto("/admin/products");
  const body = await (await movementsResponse).json();
  const entries = (body?.data?.entries ?? []) as Array<Record<string, unknown>>;

  // Elegimos, desde datos reales, la fecha (normalizada) con más movimientos que además
  // tenga al menos un supply_name no vacío para verificar en la columna "Insumo".
  const byDate = new Map<string, Set<string>>();
  for (const entry of entries) {
    const date = normalizeDate(String(entry.entry_date ?? ""));
    if (!date) continue;
    const supply = String(entry.supply_name ?? "").trim();
    if (!byDate.has(date)) byDate.set(date, new Set());
    if (supply) byDate.get(date)!.add(supply);
  }
  const candidate = [...byDate.entries()]
    .filter(([, supplies]) => supplies.size > 0)
    .sort((a, b) => b[1].size - a[1].size)[0];

  test.skip(!candidate, "project 30 no tiene movimientos con fecha + insumo para verificar H1");
  const [targetDate, expectedSupplies] = candidate!;
  const expectedSupply = [...expectedSupplies][0];

  const popover = filterPopover(page);

  // 1) Aplicar el filtro de Fecha (opciones normalizadas "YYYY-MM-DD").
  await openColumnFilter(page, /Fecha/);
  await popover.getByPlaceholder("Buscar opción...").fill(targetDate);
  await popover.locator("label").filter({ hasText: targetDate }).getByRole("checkbox").check();
  await popover.getByRole("button", { name: "Aplicar" }).click();

  // 2) Abrir el filtro de "Insumo": NO debe decir "Sin resultados", debe haber opciones
  //    (checkbox "Seleccionar todo" + al menos una opción real) e incluir el insumo que
  //    sabemos que sobrevive al filtro de fecha.
  await openColumnFilter(page, /Insumo/);
  await expect(popover.getByText("Sin resultados")).toHaveCount(0);
  expect(await popover.getByRole("checkbox").count()).toBeGreaterThan(1);
  await expect(popover.getByText(expectedSupply, { exact: true }).first()).toBeVisible();
});

// REGRESIÓN H3: en Tasks, las columnas "Superficie"/"Costo $/Ha" no tienen filterType,
// así que filtran con un valor escalar (input de texto). El cálculo de opciones de las
// demás columnas debe usar el MISMO criterio (exacto) que el filtrado de filas. Antes del
// fix usaba substring, ofreciendo opciones que al seleccionarse daban cero filas.
test("tasks: opciones cruzadas coherentes con filtro escalar de Superficie (H3)", async ({
  page,
}) => {
  const laborsResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/labors/30") &&
      response.ok()
  );

  await page.goto("/admin/tasks");
  const body = await (await laborsResponse).json();
  const data = body?.data ?? {};
  const tasks = (Array.isArray(data) ? data : (data.labor_groups ?? data.data ?? [])) as Array<
    Record<string, unknown>
  >;

  // Buscamos un valor de surface_ha "V" tal que exista OTRO surface_ha que lo contenga
  // como substring (p.ej. "10" y "100"): solo entonces el bug substring-vs-exacto se
  // manifiesta. Derivamos los crop_name esperados con semántica EXACTA.
  const surfaceValues = tasks.map((t) => String(t.surface_ha ?? "").trim()).filter(Boolean);
  const distinctSurfaces = [...new Set(surfaceValues)];

  let chosen: { value: string; expectedCrops: Set<string> } | null = null;
  for (const value of distinctSurfaces) {
    const hasSubstringCollision = distinctSurfaces.some((v) => v !== value && v.includes(value));
    if (!hasSubstringCollision) continue;
    const exactCrops = new Set(
      tasks
        .filter((t) => String(t.surface_ha ?? "").trim() === value)
        .map((t) => String(t.crop_name ?? "").trim())
        .filter(Boolean)
    );
    if (exactCrops.size > 0) {
      chosen = { value, expectedCrops: exactCrops };
      break;
    }
  }

  test.skip(
    !chosen,
    "datos de project 30 no permiten distinguir substring-vs-exacto en surface_ha"
  );
  const { value, expectedCrops } = chosen!;

  const popover = filterPopover(page);

  // 1) Filtrar "Superficie" (input de texto) con el valor escalar exacto.
  await openColumnFilter(page, /Superficie/);
  await popover.getByRole("textbox").fill(value);
  await popover.getByRole("button", { name: "Aplicar" }).click();

  // 2) Abrir "Cultivo": cada opción ofrecida (acotada al popover) debe pertenecer al
  //    conjunto exacto esperado; con el bug substring habría opciones de más.
  await openColumnFilter(page, /Cultivo/);
  await expect(popover.getByText("Sin resultados")).toHaveCount(0);

  const optionLabels = await popover
    .locator("label")
    .filter({ hasNotText: "Seleccionar todo" })
    .filter({ hasNotText: "Filtro" })
    .allInnerTexts();
  const shownCrops = optionLabels.map((t) => t.trim()).filter(Boolean);

  expect(shownCrops.length).toBeGreaterThan(0);
  for (const crop of shownCrops) {
    expect(
      expectedCrops.has(crop),
      `la opción "${crop}" no corresponde a ninguna fila con surface_ha === "${value}" (regresión substring de H3)`
    ).toBe(true);
  }
});
