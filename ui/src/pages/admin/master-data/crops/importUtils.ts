import { normalizeHeader } from "../../../../lib/importHelpers";

export type CropImportRow = {
  name: string;
};

const NAME_HEADERS = new Set(["nombre", "name", "cultivo", "crop"]);

function detectSeparator(firstLine: string): string {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
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

export function normalizeCropImportName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseCropImportCsv(content: string): CropImportRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^sep=.$/i.test(line));

  if (lines.length === 0) return [];

  const separator = detectSeparator(lines[0]);
  const rows = lines.map((line) => parseCsvLine(line, separator));
  const headers = rows[0].map((header) => normalizeHeader(header));
  const headerNameIndex = headers.findIndex((header) => NAME_HEADERS.has(header));
  const nameIndex = headerNameIndex >= 0 ? headerNameIndex : 0;
  const dataRows = headerNameIndex >= 0 ? rows.slice(1) : rows;
  const seen = new Set<string>();
  const parsedRows: CropImportRow[] = [];

  dataRows.forEach((row) => {
    const name = String(row[nameIndex] ?? "").replace(/\s+/g, " ").trim();
    const key = normalizeCropImportName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    parsedRows.push({ name });
  });

  return parsedRows;
}

export function readCropImportFile(file: File) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}
