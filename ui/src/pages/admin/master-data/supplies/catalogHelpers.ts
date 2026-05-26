import type { Supply } from "../../../../hooks/useSupplies/types";

/**
 * Constantes, types y funciones puras del SuppliesCatalog. La mayoría
 * son parsers de CSV/Excel — el componente acepta importar el catálogo
 * desde archivos exportados por el propio BE (mismo formato) o por terceros
 * (con headers en español). HEADER_ALIASES define los nombres equivalentes.
 */

export interface Row {
  id: number;
  name: string;
  unit: string;
  price: string;
  type: string;
  category: string;
  is_partial_price: boolean;
}

export interface PendingImport {
  newRows: Row[];
  duplicates: { existing: Supply; updated: Supply }[];
  warnings: string[];
}

export const HEADER_ALIASES = {
  name: ["insumo", "nombre", "name"],
  unit: ["unidad", "unit"],
  // Support stock exports too (e.g. "PRECIO U.", "PRECIO U$")
  price: [
    "precio",
    "precio_usd",
    "precio_u",
    "precio_u_usd",
    "usd",
    "u$s",
    "precio_unidad",
    "precio_unitario",
  ],
  // Nuevo:
  // - Alias para importar estado de precio desde archivos Excel/CSV.
  // - Soporta el encabezado exportado por backend: "ESTADO PRECIO".
  priceStatus: [
    "estado_precio",
    "precio_parcial",
    "is_partial_price",
    "parcial",
    "final_parcial",
    "estado_del_precio",
    "precio_tentativo",
  ],
  category: ["rubro", "categoria", "category"],
  type: ["tipo", "tipo_clase", "clase", "type"],
} as const;

export function normalizeText(value: string) {
  // Normalize headers from spreadsheets:
  // - remove accents
  // - turn common separators into underscores
  // - normalize USD markers (U$, U$S)
  // - drop remaining punctuation
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/u\$\s*s?/g, "usd")
    .replace(/\$/g, "usd")
    .replace(/[\s./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function inferUnitId(unitRaw: string, name: string): number {
  // Be forgiving: spreadsheets can have "L" / "LT" / "LTS" and sometimes the unit is only in the name.
  const normalized = normalizeText(`${unitRaw} ${name}`);
  const hay = normalized.replace(/_/g, " ");

  if (normalized === "1") return 1;
  if (
    normalized === "l" ||
    normalized === "lt" ||
    normalized === "lts" ||
    hay.includes("lts") ||
    hay.includes("lt") ||
    hay.includes("litro") ||
    hay.includes("litros") ||
    hay.includes("ltrs")
  ) {
    return 1;
  }

  if (normalized === "2") return 2;
  if (
    hay.includes("kg") ||
    hay.includes("kgs") ||
    hay.includes("kgr") ||
    hay.includes("kilo") ||
    hay.includes("kilos") ||
    /\b\d+\s*g\b/.test(hay)
  ) {
    return 2;
  }

  if (normalized === "3") return 3;
  if (
    hay.includes("bolsa") ||
    hay.includes("bolsas") ||
    hay.includes("bag") ||
    hay.includes("bags")
  ) {
    return 3;
  }

  return 0;
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseCsv(content: string) {
  // Strip BOM + sep= hint so files exported by the BE re-import cleanly.
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^sep=.$/i.test(line));

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => normalizeText(h));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

export function getValueByAliases(row: Record<string, string>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }
  return "";
}
