import * as ExcelJS from "exceljs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadExcelRows, EXCEL_ACCEPT, readImportTableAsCsvText } from "./fileTransfer";

async function createExcelFile(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Datos");
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer as BlobPart], "import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function blobToArrayBuffer(blob: Blob) {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el blob."));
    reader.readAsArrayBuffer(blob);
  });
}

describe("fileTransfer Excel imports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("exports rows as a real xlsx workbook", async () => {
    let exportedBlob: Blob | undefined;
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:excel",
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: () => {},
    });
    vi.spyOn(window.URL, "createObjectURL").mockImplementation((blob) => {
      exportedBlob = blob as Blob;
      return "blob:excel";
    });
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadExcelRows("clientes.xlsx", [{ Nombre: "El Sueño", Total: 123.45 }], "Clientes");

    expect(exportedBlob?.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blobToArrayBuffer(exportedBlob!));
    const sheet = workbook.getWorksheet("Clientes");
    expect(sheet?.getCell("A1").value).toBe("Nombre");
    expect(sheet?.getCell("B1").value).toBe("Total");
    expect(sheet?.getCell("A2").value).toBe("El Sueño");
    expect(sheet?.getCell("B2").value).toBe(123.45);
  });
});
