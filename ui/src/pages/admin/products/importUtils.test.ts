import { describe, it, expect } from "vitest";
import {
  normalizeText,
  detectSeparator,
  parseCsvLine,
  parseCsv,
  parseImportDate,
  toCanonicalMovementType,
  normalizeSpreadsheetRow,
  getValueByAliases,
  MAX_IMPORT_FILE_SIZE_MB,
} from "./importUtils";

describe("normalizeText", () => {
  it("removes accents and normalizes to lowercase", () => {
    expect(normalizeText("Número Remito")).toBe("numero_remito");
    expect(normalizeText("Campaña")).toBe("campana");
  });

  it("collapses whitespace and special chars into underscores", () => {
    expect(normalizeText("tipo / ingreso")).toBe("tipo_ingreso");
    expect(normalizeText("N° Remito")).toBe("n_remito");
  });

  it("trims leading and trailing underscores", () => {
    expect(normalizeText("  _hello_  ")).toBe("hello");
  });

  it("returns empty for empty input", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });
});

describe("detectSeparator", () => {
  it("returns comma when commas dominate", () => {
    expect(detectSeparator("a,b,c,d")).toBe(",");
  });

  it("returns semicolon when semicolons dominate", () => {
    expect(detectSeparator("a;b;c;d")).toBe(";");
  });

  it("returns comma when counts are equal (default)", () => {
    expect(detectSeparator("a;b,c")).toBe(",");
  });

  it("handles line with no separators", () => {
    expect(detectSeparator("single_column")).toBe(",");
  });

  it("detects semicolon in typical es-AR Excel export header", () => {
    expect(
      detectSeparator("Ingreso;Fecha;Remito;Proveedor;Inversor;Insumo;Cantidad")
    ).toBe(";");
  });
});

describe("parseCsvLine", () => {
  it("splits by comma by default", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("splits by semicolon when specified", () => {
    expect(parseCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted values with commas inside", () => {
    expect(parseCsvLine('"hello, world",b,c')).toEqual([
      "hello, world",
      "b",
      "c",
    ]);
  });

  it("handles escaped quotes inside quoted values", () => {
    expect(parseCsvLine('"he said ""hi""",b')).toEqual([
      'he said "hi"',
      "b",
    ]);
  });

  it("handles semicolons inside quoted values with semicolon separator", () => {
    expect(parseCsvLine('"a;b";c;d', ";")).toEqual(["a;b", "c", "d"]);
  });

  it("trims whitespace around values", () => {
    expect(parseCsvLine("  a , b , c  ")).toEqual(["a", "b", "c"]);
  });
});

describe("parseCsv", () => {
  it("parses a simple comma-separated CSV", () => {
    const csv = "name,qty\nGlifosato,100\nUrea,50";
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: "Glifosato", qty: "100" },
      { name: "Urea", qty: "50" },
    ]);
  });

  it("parses a semicolon-separated CSV (es-AR Excel export)", () => {
    const csv = "Insumo;Cantidad;Proveedor\nGlifosato;100;AgroMax\nUrea;50;SemAr";
    const result = parseCsv(csv);
    expect(result).toEqual([
      { insumo: "Glifosato", cantidad: "100", proveedor: "AgroMax" },
      { insumo: "Urea", cantidad: "50", proveedor: "SemAr" },
    ]);
  });

  it("normalizes headers via normalizeText", () => {
    const csv = "Número Remito,Fecha\n001,2024-01-01";
    const result = parseCsv(csv);
    expect(result).toEqual([{ numero_remito: "001", fecha: "2024-01-01" }]);
  });

  it("returns empty array when less than 2 lines", () => {
    expect(parseCsv("just_a_header")).toEqual([]);
    expect(parseCsv("")).toEqual([]);
  });

  it("skips blank lines", () => {
    const csv = "a,b\n\n1,2\n\n3,4\n";
    const result = parseCsv(csv);
    expect(result).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("handles Windows line endings (CRLF)", () => {
    const csv = "a,b\r\n1,2\r\n3,4\r\n";
    expect(parseCsv(csv)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });
});

describe("parseImportDate", () => {
  it("parses ISO format YYYY-MM-DD", () => {
    expect(parseImportDate("2024-01-15")).toBe("2024-01-15");
  });

  it("parses ISO format with slashes", () => {
    expect(parseImportDate("2024/1/5")).toBe("2024-01-05");
  });

  it("parses DD/MM/YYYY (Argentine format)", () => {
    expect(parseImportDate("15/01/2024")).toBe("2024-01-15");
  });

  it("parses DD-MM-YYYY", () => {
    expect(parseImportDate("5-3-2024")).toBe("2024-03-05");
  });

  it("parses DD/MM/YY with 2-digit year", () => {
    expect(parseImportDate("15/01/24")).toBe("2024-01-15");
  });

  it("returns empty for empty input", () => {
    expect(parseImportDate("")).toBe("");
    expect(parseImportDate("   ")).toBe("");
  });

  it("returns empty for invalid format", () => {
    expect(parseImportDate("not-a-date")).toBe("");
    expect(parseImportDate("Jan 15 2024")).toBe("");
  });
});

describe("toCanonicalMovementType", () => {
  it("maps stock to Stock", () => {
    expect(toCanonicalMovementType("Stock")).toBe("Stock");
    expect(toCanonicalMovementType("stock")).toBe("Stock");
  });

  it("maps movimiento interno", () => {
    expect(toCanonicalMovementType("Movimiento interno")).toBe(
      "Movimiento interno"
    );
    expect(toCanonicalMovementType("movimiento_interno")).toBe(
      "Movimiento interno"
    );
  });

  it("maps remito oficial", () => {
    expect(toCanonicalMovementType("Remito oficial")).toBe("Remito oficial");
    expect(toCanonicalMovementType("remito_oficial")).toBe("Remito oficial");
  });

  it("returns null for unknown type", () => {
    expect(toCanonicalMovementType("desconocido")).toBeNull();
    expect(toCanonicalMovementType("")).toBeNull();
  });
});

describe("normalizeSpreadsheetRow", () => {
  it("normalizes keys and stringifies values", () => {
    const row = { "Número Remito": 42, Fecha: null, Insumo: "Glifosato" };
    expect(normalizeSpreadsheetRow(row)).toEqual({
      numero_remito: "42",
      fecha: "",
      insumo: "Glifosato",
    });
  });
});

describe("getValueByAliases", () => {
  it("returns value matching first alias found", () => {
    const row = { remito: "R-001", fecha: "2024-01-01" };
    expect(getValueByAliases(row, ["numero_remito", "remito"])).toBe("R-001");
  });

  it("returns empty string when no alias matches", () => {
    const row = { insumo: "Glifosato" };
    expect(getValueByAliases(row, ["proveedor", "provider"])).toBe("");
  });

  it("normalizes alias names before lookup", () => {
    const row = { numero_remito: "R-001" };
    expect(getValueByAliases(row, ["numero_remito"])).toBe("R-001");
  });
});

describe("MAX_IMPORT_FILE_SIZE_MB", () => {
  it("is 5", () => {
    expect(MAX_IMPORT_FILE_SIZE_MB).toBe(5);
  });
});
