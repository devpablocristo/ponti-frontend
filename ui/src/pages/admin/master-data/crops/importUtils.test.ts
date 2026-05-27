import { describe, expect, it } from "vitest";

import { normalizeCropImportName, parseCropImportCsv } from "./importUtils";

describe("crop import utils", () => {
  it("parses crop names from Nombre header", () => {
    expect(parseCropImportCsv("Nombre\nTrigo\nPoroto mung")).toEqual([
      { name: "Trigo" },
      { name: "Poroto mung" },
    ]);
  });

  it("accepts semicolon-separated CSV and cultivo aliases", () => {
    expect(parseCropImportCsv("Cultivo;Notas\nSoja;verano\nGarbanzo;invierno")).toEqual([
      { name: "Soja" },
      { name: "Garbanzo" },
    ]);
  });

  it("deduplicates by normalized crop name", () => {
    expect(parseCropImportCsv("name\nEl Sueño\nel sueno\nEL SUEÑO")).toEqual([
      { name: "El Sueño" },
    ]);
  });

  it("uses the first column when the CSV has no recognized header", () => {
    expect(parseCropImportCsv("Trigo\nSoja")).toEqual([{ name: "Trigo" }, { name: "Soja" }]);
  });

  it("normalizes accents and whitespace for duplicate checks", () => {
    expect(normalizeCropImportName("  Caña   de Azúcar  ")).toBe("cana de azucar");
  });
});
