import readSpreadsheet from "read-excel-file/browser";

type CellValue = string | number | boolean | Date | null | undefined;
type SheetData = {
  sheet: string;
  data: CellValue[][];
};

type ReadSpreadsheetRowsOptions = {
  preferredSheetNameIncludes?: string[];
};

const normalizeSheetName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const cellToValue = (value: CellValue): string => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const rowHasValues = (row: CellValue[]) =>
  row.some((value) => cellToValue(value) !== "");

const sheetToObjects = (rows: CellValue[][]): Record<string, string>[] => {
  const firstRowIndex = rows.findIndex(rowHasValues);
  if (firstRowIndex === -1) return [];

  const headers = rows[firstRowIndex].map(cellToValue);
  if (headers.every((header) => header === "")) return [];

  return rows
    .slice(firstRowIndex + 1)
    .filter(rowHasValues)
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = cellToValue(row[index]);
      });
      return record;
    });
};

function rankSheets(
  sheets: SheetData[],
  preferredSheetNameIncludes: string[],
): SheetData[] {
  const normalizedPreferred = preferredSheetNameIncludes.map(normalizeSheetName);

  return [...sheets].sort((a, b) => {
    const aName = normalizeSheetName(a.sheet);
    const bName = normalizeSheetName(b.sheet);
    const aRank = normalizedPreferred.findIndex((value) => aName.includes(value));
    const bRank = normalizedPreferred.findIndex((value) => bName.includes(value));
    const normalizedARank = aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank;
    const normalizedBRank = bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank;
    return normalizedARank - normalizedBRank;
  });
}

export async function readSpreadsheetRows(
  file: File,
  { preferredSheetNameIncludes = [] }: ReadSpreadsheetRowsOptions = {},
): Promise<Record<string, string>[]> {
  const sheets = (await readSpreadsheet(file)) as SheetData[];
  const rankedSheets = rankSheets(sheets, preferredSheetNameIncludes);

  for (const sheet of rankedSheets) {
    const rows = sheetToObjects(sheet.data);
    if (rows.length > 0) return rows;
  }

  return [];
}
