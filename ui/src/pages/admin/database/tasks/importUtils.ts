import {
  normalizeText as _normalizeText,
  parsePartialPrice as _parsePartialPrice,
  type ParsedPartialPrice as _ParsedPartialPrice,
} from "@/lib/importHelpers";

export const normalizeText = _normalizeText;
export const parsePartialPrice = _parsePartialPrice;
export type ParsedPartialPrice = _ParsedPartialPrice;

export const LABOR_HEADER_ALIASES = {
  name: ["labor", "nombre", "name"],
  category: ["rubro", "categoria", "category"],
  price: ["precio", "precio_usd", "usd", "u$s"],
  contractor: ["contratista", "contractor", "proveedor"],
  priceStatus: [
    "estado_precio",
    "precio_parcial",
    "is_partial_price",
    "parcial",
    "final_parcial",
    "estado_del_precio",
    "precio_tentativo",
  ],
} as const;

export function detectSeparator(firstLine: string) {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

export function parseCsvLine(line: string, separator = ",") {
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
    if (char === separator && !insideQuotes) {
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
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const separator = detectSeparator(lines[0]);
  const headers = parseCsvLine(lines[0], separator).map((header) =>
    normalizeText(header)
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

export function normalizeSpreadsheetRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeText(key)] = String(value ?? "").trim();
  });
  return normalized;
}

export function getValueByAliases(
  row: Record<string, string>,
  aliases: readonly string[]
) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }
  return "";
}

