import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { EXCEL_ACCEPT, readImportTableAsCsvText } from "./fileTransfer";

async function createExcelFile(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Datos");
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer as BlobPart], "import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("fileTransfer Excel imports", () => {
  it("exposes an xlsx-only file accept value", () => {
    expect(EXCEL_ACCEPT).toContain(".xlsx");
    expect(EXCEL_ACCEPT).toContain("spreadsheetml.sheet");
    expect(EXCEL_ACCEPT).not.toContain("text/csv");
  });

  it("reads the first Excel worksheet as delimited text for existing import parsers", async () => {
    const file = await createExcelFile([
      ["Nombre", "Fecha", "Total"],
      ["El Sueño", new Date(Date.UTC(2026, 4, 27)), 123.45],
    ]);

    await expect(readImportTableAsCsvText(file)).resolves.toBe(
      '"Nombre","Fecha","Total"\n"El Sueño","2026-05-27","123.45"'
    );
  });
});
