import { describe, expect, it } from "vitest";
import {
  detectSeparator,
  getValueByAliases,
  LABOR_HEADER_ALIASES,
  parseCsv,
  parsePartialPrice,
} from "./importUtils";

describe("task import utils", () => {
  it("detects semicolon-separated CSV files", () => {
    expect(detectSeparator("labor;precio;contratista")).toBe(";");
    expect(detectSeparator("labor,precio,contratista")).toBe(",");
  });

  it("parses semicolon-separated task CSV rows", () => {
    const rows = parseCsv(
      ["Labor;Rubro;Precio;Estado Precio;Contratista", "Siembra;1;12,5;Parcial;ACME"].join(
        "\n"
      )
    );

    expect(rows).toEqual([
      {
        labor: "Siembra",
        rubro: "1",
        precio: "12,5",
        estado_precio: "Parcial",
        contratista: "ACME",
      },
    ]);
  });

  it("resolves alias values from normalized headers", () => {
    const row = {
      precio_tentativo: "tentativo",
      proveedor: "Contratista SA",
    };

    expect(getValueByAliases(row, LABOR_HEADER_ALIASES.priceStatus)).toBe(
      "tentativo"
    );
    expect(getValueByAliases(row, LABOR_HEADER_ALIASES.contractor)).toBe(
      "Contratista SA"
    );
  });

  it("parses valid partial price values", () => {
    expect(parsePartialPrice("Parcial")).toEqual({
      provided: true,
      valid: true,
      value: true,
    });
    expect(parsePartialPrice("Final")).toEqual({
      provided: true,
      valid: true,
      value: false,
    });
    expect(parsePartialPrice("")).toEqual({
      provided: false,
      valid: true,
      value: false,
    });
  });

  it("marks invalid partial price values as invalid", () => {
    expect(parsePartialPrice("quizas")).toEqual({
      provided: true,
      valid: false,
      value: false,
    });
  });
});
