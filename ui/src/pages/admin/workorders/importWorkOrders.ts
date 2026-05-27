import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";
import {
  getValueByAliases,
  normalizeText,
  parseCsv,
  parseImportDate,
} from "../supply-movements/importUtils";

export type ImportWorkOrdersResult = {
  imported: number;
  errors: string[];
};

// Una fila parseada y resuelta del CSV. Una por línea CSV (no agrupada).
// Se muestra en el drawer de preview: el usuario ve cada fila y decide qué
// incluir antes de hacer POST. Los `*_resolved_name` son los valores raw del
// CSV cuando el nombre no resolvió contra el catálogo — útiles para que el
// drawer muestre el nombre roto en rojo en lugar de un id 0 abstracto.
export type WorkOrderPreviewRow = {
  rowNumber: number; // línea del CSV (2-based: 1 es header)
  number: string;
  fieldId: number;
  fieldName: string;
  lotId: number;
  lotName: string;
  cropId: number;
  cropName: string;
  laborId: number;
  laborName: string;
  investorId: number;
  investorName: string;
  contractor: string;
  observations: string;
  date: string;
  effectiveArea: number;
  supplyId: number;
  totalUsed: number;
  finalDose: number;
  rowErrors: string[];
  // `existing` = ya existe en el BE con el mismo número (skip por default).
  existing: boolean;
};

export type ParseResult = {
  rows: WorkOrderPreviewRow[];
  globalErrors: string[];
  diag: FetchDiag[];
};

type ParseArgs = {
  file: File;
  projectId: number;
  defaultFieldId?: number;
};

// Catálogos por proyecto necesarios para resolver columnas con nombres
// (CAMPO, LOTE, CULTIVO, LABOR, INVERSOR) — los headers del export.
type Lookup = {
  fields: Map<string, number>;
  lots: Map<string, number>;
  crops: Map<string, number>;
  labors: Map<string, number>;
  investors: Map<string, number>;
};

type Indexable = { id: number } & Record<string, unknown>;

function pickFirstString(item: Indexable, keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function indexBy(items: Indexable[] | null | undefined, nameKeys: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (!items) return out;
  for (const item of items) {
    if (!item || typeof item.id !== "number") continue;
    const key = normalizeText(pickFirstString(item, nameKeys));
    if (key && !out.has(key)) out.set(key, item.id);
  }
  return out;
}

// La cadena pasa por el BFF, no por el BE directo. Cada endpoint del BFF
// (`web/api/src/routes/*.ts`) envuelve la respuesta a su manera:
//
// - `/crops` y `/projects/:id/labors` → `{success: true, data: [...array...]}`
// - `/investors`, `/fields?project_id=X`, `/lots` →
//   `{success: true, data: {data: [...array...], total | page_info}}`
//
// **No** existe handler BFF para `/projects/:id/fields` (404). Usar
// `/fields?project_id=X`. El interceptor del apiClient detecta `success`
// ya presente y NO re-envuelve.
type Wrapped<T> = { success?: boolean; data?: T };

function extractArray(payload: unknown): Indexable[] {
  if (Array.isArray(payload)) return payload as Indexable[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Indexable[];
  if (Array.isArray(obj.items)) return obj.items as Indexable[];

  if (obj.data && typeof obj.data === "object") {
    const inner = obj.data as Record<string, unknown>;
    if (Array.isArray(inner.data)) return inner.data as Indexable[];
    if (Array.isArray(inner.items)) return inner.items as Indexable[];
  }
  return [];
}

type FetchDiag = { path: string; size: number; reason: string };

async function fetchArray(path: string, diag: FetchDiag[]): Promise<Indexable[]> {
  try {
    const body = await apiClient.get<Wrapped<unknown>>(path);
    const candidate =
      body && typeof body === "object" && "data" in body ? body.data : body;
    const arr = extractArray(candidate);
    diag.push({ path, size: arr.length, reason: arr.length > 0 ? "ok" : "empty array" });
    return arr;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diag.push({ path, size: 0, reason: "request failed: " + msg });
    return [];
  }
}

async function loadLookup(
  projectId: number,
): Promise<{ lookup: Lookup; diag: FetchDiag[] }> {
  const diag: FetchDiag[] = [];
  const [fields, lots, crops, labors, investors] = await Promise.all([
    fetchArray(`/fields?project_id=${projectId}&per_page=1000`, diag),
    fetchArray(`/lots?project_id=${projectId}&per_page=1000`, diag),
    fetchArray(`/crops?per_page=1000`, diag),
    fetchArray(`/projects/${projectId}/labors?per_page=1000`, diag),
    fetchArray(`/investors?per_page=1000`, diag),
  ]);

  return {
    lookup: {
      fields: indexBy(fields, ["name", "field_name"]),
      lots: indexBy(lots, ["lot_name", "name"]),
      crops: indexBy(crops, ["name", "crop_name"]),
      labors: indexBy(labors, ["name", "labor_name"]),
      investors: indexBy(investors, ["name", "investor_name"]),
    },
    diag,
  };
}

// Carga todos los números de OT existentes del proyecto. Lo usa el preview
// para marcar duplicados antes de POSTear y evitar errores 409 después.
async function fetchExistingWorkOrderNumbers(projectId: number): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const body = await apiClient.get<Wrapped<unknown>>(
      `/work-orders?project_id=${projectId}&per_page=10000`,
    );
    const candidate =
      body && typeof body === "object" && "data" in body ? body.data : body;
    const arr = extractArray(candidate);
    for (const it of arr) {
      const num = it["number"];
      if (typeof num === "string" && num.trim()) set.add(num.trim());
    }
  } catch {
    // Si falla, devolvemos set vacío → no marca duplicados (el BE igual los rechaza).
  }
  return set;
}

function resolveID(
  row: Record<string, string>,
  idAliases: string[],
  nameAliases: string[],
  lookup: Map<string, number>,
): { id: number; rawName: string } {
  const rawID = getValueByAliases(row, idAliases);
  if (rawID) {
    const parsed = Number(rawID);
    if (!Number.isNaN(parsed) && parsed > 0) return { id: parsed, rawName: "" };
  }
  const rawName = getValueByAliases(row, nameAliases);
  if (!rawName) return { id: 0, rawName: "" };
  const key = normalizeText(rawName);
  return { id: lookup.get(key) ?? 0, rawName };
}

// Parsea el CSV, resuelve nombres contra el catálogo, marca duplicados.
// No hace POSTs — devuelve las filas para que el drawer las muestre y el
// usuario decida cuáles importar.
export async function parseAndResolveWorkOrdersCsv({
  file,
  projectId,
  defaultFieldId,
}: ParseArgs): Promise<ParseResult> {
  const rawRows = parseCsv(await file.text());
  if (rawRows.length === 0) {
    return {
      rows: [],
      globalErrors: ["El archivo no tiene órdenes válidas. Use CSV con encabezados."],
      diag: [],
    };
  }

  const [{ lookup, diag }, existingNumbers] = await Promise.all([
    loadLookup(projectId),
    fetchExistingWorkOrderNumbers(projectId),
  ]);

  const globalErrors: string[] = [];

  // Avisos globales: si un catálogo está vacío pero el CSV trae valores que
  // dependerían de él, mostramos diagnóstico (request fallido, shape rara, etc.).
  const wants = {
    fields: rawRows.some((r) => getValueByAliases(r, ["campo", "field", "field_name"]).trim()),
    lots: rawRows.some((r) => getValueByAliases(r, ["lote", "lot", "lot_name"]).trim()),
    crops: rawRows.some((r) => getValueByAliases(r, ["cultivo", "crop", "crop_name"]).trim()),
    labors: rawRows.some((r) =>
      getValueByAliases(r, ["labor", "labor_name", "nombre_labor"]).trim(),
    ),
    investors: rawRows.some((r) =>
      getValueByAliases(r, ["inversor", "investor", "investor_name"]).trim(),
    ),
  };
  const diagSummary = diag
    .map((d) => `${d.path} → ${d.reason} (${d.size})`)
    .join(" | ");
  if (wants.fields && lookup.fields.size === 0) {
    globalErrors.push(`Catálogo de campos vacío. Diagnóstico: ${diagSummary}`);
  }
  if (wants.lots && lookup.lots.size === 0) {
    globalErrors.push(`Catálogo de lotes vacío. Diagnóstico: ${diagSummary}`);
  }
  if (wants.crops && lookup.crops.size === 0) {
    globalErrors.push(`Catálogo de cultivos vacío. Diagnóstico: ${diagSummary}`);
  }
  if (wants.labors && lookup.labors.size === 0) {
    globalErrors.push(`Catálogo de labores vacío. Diagnóstico: ${diagSummary}`);
  }
  if (wants.investors && lookup.investors.size === 0) {
    globalErrors.push(`Catálogo de inversores vacío. Diagnóstico: ${diagSummary}`);
  }

  const rows: WorkOrderPreviewRow[] = [];

  for (const [index, row] of rawRows.entries()) {
    const rowNumber = index + 2;
    const number = getValueByAliases(row, [
      "numero",
      "nro",
      "n",
      "number",
      "ot_n",
      "numero_de_orden",
      "n_de_orden",
    ]);

    // El export agrega una fila "TOTAL" al final. Ignorarla.
    if (number.trim().toUpperCase() === "TOTAL") continue;

    const field = resolveID(
      row,
      ["campo_id", "field_id"],
      ["campo", "field", "field_name"],
      lookup.fields,
    );
    const fieldId = field.id || defaultFieldId || 0;
    const lot = resolveID(row, ["lote_id", "lot_id"], ["lote", "lot", "lot_name"], lookup.lots);
    const crop = resolveID(
      row,
      ["cultivo_id", "crop_id"],
      ["cultivo", "crop", "crop_name"],
      lookup.crops,
    );
    const labor = resolveID(
      row,
      ["labor_id"],
      ["labor", "labor_name", "nombre_labor"],
      lookup.labors,
    );
    const investor = resolveID(
      row,
      ["inversor_id", "investor_id"],
      ["inversor", "investor", "investor_name"],
      lookup.investors,
    );
    const supplyId = Number(getValueByAliases(row, ["insumo_id", "supply_id"]) || 0);
    const effectiveArea = Number(
      getValueByAliases(row, [
        "superficie",
        "superficie_has",
        "effective_area",
        "supérficie",
        "superficie_realizada",
      ]) || 0,
    );
    const totalUsed = Number(
      getValueByAliases(row, ["consumo", "cantidad", "total_used"]) || 0,
    );
    const finalDose = Number(getValueByAliases(row, ["dosis", "dose", "final_dose"]) || 0);
    const date = parseImportDate(getValueByAliases(row, ["fecha", "date"]));

    const rowErrors: string[] = [];
    if (!number) rowErrors.push("falta número");
    if (!date) rowErrors.push("fecha inválida");
    if (!fieldId) rowErrors.push(`campo '${field.rawName}' no encontrado`);
    if (!lot.id) rowErrors.push(`lote '${lot.rawName}' no encontrado`);
    if (!crop.id) rowErrors.push(`cultivo '${crop.rawName}' no encontrado`);
    if (!labor.id) rowErrors.push(`labor '${labor.rawName}' no encontrada`);
    if (!investor.id && investor.rawName) {
      rowErrors.push(`inversor '${investor.rawName}' no encontrado`);
    }
    if (!effectiveArea) rowErrors.push("falta superficie");
    if (supplyId && (!totalUsed || !finalDose)) {
      rowErrors.push("insumo_id requiere consumo y dosis");
    }

    rows.push({
      rowNumber,
      number,
      fieldId,
      fieldName: field.rawName,
      lotId: lot.id,
      lotName: lot.rawName,
      cropId: crop.id,
      cropName: crop.rawName,
      laborId: labor.id,
      laborName: labor.rawName,
      investorId: investor.id,
      investorName: investor.rawName,
      contractor: getValueByAliases(row, ["contratista", "contractor"]),
      observations: getValueByAliases(row, ["observaciones", "observations"]),
      date,
      effectiveArea,
      supplyId,
      totalUsed,
      finalDose,
      rowErrors,
      existing: number ? existingNumbers.has(number.trim()) : false,
    });
  }

  return { rows, globalErrors, diag };
}

// POSTea las filas seleccionadas. Cada fila → un POST a /work-orders.
// No agrupa: respeta la elección del usuario ("una fila por línea de CSV").
//
// **Regla del producto**: el importador NUNCA actualiza. Si la fila viene
// marcada `existing: true`, se skipea acá aunque el caller la haya pasado.
// El drawer ya las deshabilita en UI, este check es la red de seguridad.
export async function submitWorkOrderRows(
  rows: WorkOrderPreviewRow[],
  projectId: number,
): Promise<ImportWorkOrdersResult> {
  const errors: string[] = [];
  let imported = 0;

  for (const r of rows) {
    if (r.existing) {
      errors.push(
        `Fila ${r.rowNumber}: OT '${r.number}' ya existe. Eliminala primero si querés re-importarla.`,
      );
      continue;
    }
    if (r.rowErrors.length > 0) {
      errors.push(`Fila ${r.rowNumber}: ${r.rowErrors.join("; ")}.`);
      continue;
    }
    try {
      await apiClient.post("/work-orders", {
        number: r.number,
        project_id: projectId,
        field_id: r.fieldId,
        lot_id: r.lotId,
        crop_id: r.cropId,
        labor_id: r.laborId,
        contractor: r.contractor,
        observations: r.observations,
        date: r.date,
        investor_id: r.investorId,
        effective_area: r.effectiveArea,
        items: r.supplyId
          ? [{ supply_id: r.supplyId, total_used: r.totalUsed, final_dose: r.finalDose }]
          : [],
      });
      imported += 1;
    } catch (error) {
      errors.push(
        `Fila ${r.rowNumber}: ${formatError(error, { fallback: "No se pudo crear la orden de trabajo." })}`,
      );
    }
  }

  return { imported, errors };
}

// Wrapper de compatibilidad — flujo "parse + POST inmediato" sin drawer.
// Se mantiene para tests existentes; el flujo nuevo usa el drawer de preview
// y llama parseAndResolveWorkOrdersCsv + submitWorkOrderRows por separado.
export async function importWorkOrdersFromCsv(
  args: ParseArgs,
): Promise<ImportWorkOrdersResult> {
  const parsed = await parseAndResolveWorkOrdersCsv(args);
  if (parsed.globalErrors.length > 0) {
    return { imported: 0, errors: parsed.globalErrors };
  }
  return submitWorkOrderRows(parsed.rows, args.projectId);
}
