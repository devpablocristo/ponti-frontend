const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const EXCEL_ACCEPT = `.xlsx,${EXCEL_MIME}`;

export function buildTimestampedFilename(
  prefix: string,
  extension: "xlsx",
  id?: number | string | null
) {
  const suffix = id == null ? "" : `_${id}`;
  return `${prefix}${suffix}_${new Date().toISOString()}.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function excelExportCellToValue(value: unknown): string | number | boolean | Date {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function excelCellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.result === "string" || typeof obj.result === "number") {
      return String(obj.result);
    }
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          part && typeof part === "object" && "text" in part
            ? String((part as { text?: unknown }).text ?? "")
            : ""
        )
        .join("");
    }
  }
  return String(value);
}

function isExcelFile(file: File) {
  const name = (file.name ?? "").toLowerCase();
  return name.endsWith(".xlsx") || file.type === EXCEL_MIME;
}

function readFileAsArrayBuffer(file: File) {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

export async function readImportTableAsCsvText(file: File): Promise<string> {
  if (!isExcelFile(file)) {
    return file.text();
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFileAsArrayBuffer(file));
  const sheet = workbook.worksheets[0];
  if (!sheet) return "";

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values.map((value) => excelCellToString(value)));
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export async function downloadExcelRows(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName = "Datos"
) {
  const headers = Object.keys(rows[0] ?? {});
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName || "Datos");

  if (headers.length > 0) {
    sheet.addRow(headers);
    rows.forEach((row) => {
      sheet.addRow(headers.map((header) => excelExportCellToValue(row[header])));
    });
    sheet.columns.forEach((column) => {
      column.width = Math.max(
        12,
        ...((column.values ?? []).map((value) => String(value ?? "").length + 2) as number[])
      );
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: EXCEL_MIME }), filename);
}
