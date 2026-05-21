import { apiClient } from "@/api/client";
import { extractErrorMessage } from "@/api/hooks/useApiCall";
import {
  getValueByAliases,
  normalizeText,
  parseCsv,
  parseImportDate,
} from "../supply-movements/importUtils";
import { LotsData, Crop } from "../../../hooks/useLots/types";

export type ImportLotsResult = {
  imported: number;
  errors: string[];
};

// Una fila parseada del CSV de lotes. Mismo modelo que OT:
//   - `existing: true` → la fila matchea un lote ya creado en el proyecto.
//     Se marca amarillo y se skipea por default (no se crea ni actualiza).
//   - `rowErrors` no vacío → falta dato o no resuelve algún catálogo. Rojo,
//     no se postea.
//   - Caso feliz → se hace POST /lots para crearlo en el proyecto.
export type LotPreviewRow = {
  rowNumber: number;
  rawLotName: string;
  rawFieldName: string;
  fieldId: number;
  existing: boolean;
  previousCropId: number | null;
  previousCropRaw: string;
  currentCropId: number | null;
  currentCropRaw: string;
  variety: string;
  sowedArea: string;
  harvestedArea: string;
  sowingDate: string;
  harvestDate: string;
  season: string;
  rowErrors: string[];
};

export type ParseLotsResult = {
  rows: LotPreviewRow[];
  globalErrors: string[];
};

type ParseArgs = {
  file: File;
  projectId: number;
  // Lotes del estado actual (fallback si falla el fetch completo del proyecto).
  fallbackLots: LotsData[];
  crops: Crop[] | null | undefined;
};

type Wrapped<T> = { success?: boolean; data?: T };

type Indexable = Record<string, unknown> & { id?: number };

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

async function fetchAllProjectLots(projectId: number): Promise<LotsData[]> {
  try {
    const body = await apiClient.get<Wrapped<unknown>>(
      `/lots?project_id=${projectId}&per_page=10000`,
    );
    const candidate =
      body && typeof body === "object" && "data" in body ? body.data : body;
    return extractArray(candidate) as LotsData[];
  } catch {
    return [];
  }
}

// Map field name → id para resolver la columna CAMPO al crear lotes nuevos.
async function fetchFieldsByName(projectId: number): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const body = await apiClient.get<Wrapped<unknown>>(
      `/fields?project_id=${projectId}&per_page=1000`,
    );
    const candidate =
      body && typeof body === "object" && "data" in body ? body.data : body;
    const arr = extractArray(candidate);
    for (const f of arr) {
      const id = typeof f.id === "number" ? f.id : Number(f.id);
      const name = typeof f.name === "string" ? f.name : "";
      if (id > 0 && name) {
        const key = normalizeText(name);
        if (key && !out.has(key)) out.set(key, id);
      }
    }
  } catch {
    // Si falla, devolvemos map vacío — las filas que necesiten field_id quedan rojas.
  }
  return out;
}

// Parsea el CSV de lotes, marca duplicados contra lotes existentes del
// proyecto, resuelve cultivos y campo. No postea — el drawer recibe las
// filas para que el usuario decida cuáles crear.
export async function parseAndResolveLotsCsv({
  file,
  projectId,
  fallbackLots,
  crops,
}: ParseArgs): Promise<ParseLotsResult> {
  const rawRows = parseCsv(await file.text());
  if (rawRows.length === 0) {
    return {
      rows: [],
      globalErrors: ["El archivo no tiene lotes válidos. Use CSV con encabezados."],
    };
  }

  const [fetchedLots, fieldsByName] = await Promise.all([
    fetchAllProjectLots(projectId),
    fetchFieldsByName(projectId),
  ]);
  const allLots = fetchedLots.length > 0 ? fetchedLots : fallbackLots;

  const globalErrors: string[] = [];
  if (fieldsByName.size === 0) {
    globalErrors.push(
      "Catálogo de campos vacío. No se puede crear lotes nuevos sin field_id.",
    );
  }

  // Index de lotes existentes: `${field_name_normalizado}|${lot_name_normalizado}` → LotsData.
  // Permite detectar duplicados pese a diferencias de mayúsculas/acentos.
  const lotsByKey = new Map<string, LotsData>();
  for (const lot of allLots) {
    const key = `${normalizeText(lot.field_name)}|${normalizeText(lot.lot_name)}`;
    if (!lotsByKey.has(key)) lotsByKey.set(key, lot);
  }

  // Cultivos por nombre (acepta nombre o id en el CSV).
  const cropsByName = new Map<string, number>();
  for (const c of crops ?? []) {
    const key = c.name?.trim().toLowerCase();
    if (key && !cropsByName.has(key)) cropsByName.set(key, c.id);
  }
  const resolveCropId = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && asNum > 0) return asNum;
    return cropsByName.get(trimmed.toLowerCase()) ?? null;
  };

  const rows: LotPreviewRow[] = [];

  for (const [index, row] of rawRows.entries()) {
    const rowNumber = index + 2;
    const rawName = getValueByAliases(row, [
      "lote",
      "lot",
      "nombre",
      "lot_name",
      "lotes",
    ]);
    const rawFieldName = getValueByAliases(row, [
      "campo",
      "field",
      "field_name",
    ]).trim();

    if (rawName.trim().toUpperCase() === "TOTAL") continue;

    // Resolver field_id desde CAMPO (necesario para POST de lotes nuevos).
    // Si el CSV trae `field_id` numérico, lo usamos directo.
    const rawFieldId = getValueByAliases(row, ["field_id"]);
    let fieldId = 0;
    if (rawFieldId) {
      const parsed = Number(rawFieldId);
      if (!Number.isNaN(parsed) && parsed > 0) fieldId = parsed;
    }
    if (!fieldId && rawFieldName) {
      fieldId = fieldsByName.get(normalizeText(rawFieldName)) ?? 0;
    }

    // Match contra lote existente (clave: campo+lote normalizados).
    const matchKey = `${normalizeText(rawFieldName)}|${normalizeText(rawName)}`;
    const existing = rawName ? lotsByKey.has(matchKey) : false;

    const sowedArea = getValueByAliases(row, [
      "hectareas",
      "hectáreas",
      "superficie",
      "superficie_has",
      "sowed_area",
      "sup_siembra",
      "sup_total",
    ]);
    const harvestedArea = getValueByAliases(row, ["sup_cosecha", "harvested_area"]);
    const rawCurrentCrop = getValueByAliases(row, [
      "cultivo_actual_id",
      "current_crop_id",
      "cultivo_actual",
      "cultivo_act",
      "cultivo",
    ]);
    const rawPreviousCrop = getValueByAliases(row, [
      "cultivo_anterior_id",
      "previous_crop_id",
      "cultivo_anterior",
      "cultivo_ant",
    ]);
    const currentCrop = resolveCropId(rawCurrentCrop);
    const previousCrop = resolveCropId(rawPreviousCrop);
    const sowingDate = parseImportDate(
      getValueByAliases(row, ["fecha_siembra", "sowing_date"]),
    );
    const harvestDate = parseImportDate(
      getValueByAliases(row, ["fecha_cosecha", "harvest_date"]),
    );

    const rowErrors: string[] = [];
    // Validamos requisitos del POST solo para filas que vamos a crear.
    // Filas `existing` se skipean igual — no tiene sentido marcarlas rojo
    // por validación si nunca se van a postear.
    if (!existing) {
      if (!rawName) rowErrors.push("falta nombre del lote");
      if (!fieldId) {
        rowErrors.push(`campo '${rawFieldName}' no encontrado`);
      }
      if (!sowedArea || Number(sowedArea) <= 0) {
        rowErrors.push("falta superficie/hectáreas");
      }
      if (rawCurrentCrop && currentCrop === null) {
        rowErrors.push(`cultivo actual '${rawCurrentCrop}' no encontrado`);
      }
      if (rawPreviousCrop && previousCrop === null) {
        rowErrors.push(`cultivo anterior '${rawPreviousCrop}' no encontrado`);
      }
    }

    rows.push({
      rowNumber,
      rawLotName: rawName,
      rawFieldName,
      fieldId,
      existing,
      previousCropId: previousCrop,
      previousCropRaw: rawPreviousCrop,
      currentCropId: currentCrop,
      currentCropRaw: rawCurrentCrop,
      variety: getValueByAliases(row, ["variedad", "variety"]),
      sowedArea,
      harvestedArea,
      sowingDate,
      harvestDate,
      season: getValueByAliases(row, ["periodo", "campaña", "season"]),
      rowErrors,
    });
  }

  return { rows, globalErrors };
}

// POSTea las filas seleccionadas. Solo crea (no actualiza).
//
// **Regla del producto**: el importador de archivos NUNCA actualiza datos
// existentes. Las filas `existing: true` se skipean acá aunque el caller
// las haya pasado (red de seguridad — el drawer ya las deshabilita en UI).
// Para reimportar un lote que ya existe, el usuario debe eliminarlo
// primero por la UI normal y después subir el CSV de nuevo.
export async function submitLotRows(
  rows: LotPreviewRow[],
): Promise<ImportLotsResult> {
  const errors: string[] = [];
  let imported = 0;

  for (const r of rows) {
    if (r.existing) {
      errors.push(
        `Fila ${r.rowNumber}: lote '${r.rawLotName}' ya existe en el campo '${r.rawFieldName}'.`,
      );
      continue;
    }
    if (r.rowErrors.length > 0) {
      errors.push(`Fila ${r.rowNumber}: ${r.rowErrors.join("; ")}.`);
      continue;
    }

    const payload = {
      lot_name: r.rawLotName,
      field_id: r.fieldId,
      sowed_area: r.sowedArea,
      season: r.season,
      current_crop_id: r.currentCropId ?? null,
      previous_crop_id: r.previousCropId ?? null,
      variety: r.variety,
      dates:
        r.sowingDate || r.harvestDate
          ? [
              {
                sowing_date: r.sowingDate || "",
                harvest_date: r.harvestDate || null,
                sequence: 1,
              },
            ]
          : [],
    };

    try {
      await apiClient.post("/lots", payload);
      imported += 1;
    } catch (error) {
      errors.push(
        `Fila ${r.rowNumber}: ${extractErrorMessage(error, "error desconocido al crear el lote.")}`,
      );
    }
  }

  return { imported, errors };
}
