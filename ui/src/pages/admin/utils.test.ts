import { describe, it, expect } from "vitest";
import {
  trimTrailingZeros,
  replaceSupplyIdsWithNames,
  DEFAULT_ITEM_ROW_COUNT,
} from "./utils";

describe("trimTrailingZeros", () => {
  it("removes trailing zeros after decimal point", () => {
    expect(trimTrailingZeros("1.200")).toBe("1.2");
    expect(trimTrailingZeros("3.000")).toBe("3");
    expect(trimTrailingZeros("2.100")).toBe("2.1");
  });

  it("keeps non-zero decimals", () => {
    expect(trimTrailingZeros("1.23")).toBe("1.23");
    expect(trimTrailingZeros("0.5")).toBe("0.5");
  });

  it("removes dot when all decimals are zero", () => {
    expect(trimTrailingZeros("10.0")).toBe("10");
    expect(trimTrailingZeros("7.00")).toBe("7");
  });

  it("handles integers", () => {
    expect(trimTrailingZeros("42")).toBe("42");
    expect(trimTrailingZeros("0")).toBe("");
  });
});

describe("replaceSupplyIdsWithNames", () => {
  const supplies = [
    { id: 1, name: "Glifosato" },
    { id: 42, name: "Urea" },
    { id: 100, name: "2,4-D" },
  ];

  it("replaces supply IDs with names", () => {
    expect(
      replaceSupplyIdsWithNames("Error en insumo 1: stock insuficiente", supplies)
    ).toBe("Error en insumo Glifosato: stock insuficiente");
  });

  it("replaces multiple IDs in same message", () => {
    expect(
      replaceSupplyIdsWithNames("insumo 1 e insumo 42 conflicto", supplies)
    ).toBe("insumo Glifosato e insumo Urea conflicto");
  });

  it("keeps unknown IDs as-is", () => {
    expect(
      replaceSupplyIdsWithNames("Error en insumo 999: no encontrado", supplies)
    ).toBe("Error en insumo 999: no encontrado");
  });

  it("is case insensitive", () => {
    expect(
      replaceSupplyIdsWithNames("INSUMO 42 duplicado", supplies)
    ).toBe("insumo Urea duplicado");
  });

  it("returns empty string for empty input", () => {
    expect(replaceSupplyIdsWithNames("", supplies)).toBe("");
  });
});

describe("DEFAULT_ITEM_ROW_COUNT", () => {
  it("is 7", () => {
    expect(DEFAULT_ITEM_ROW_COUNT).toBe(7);
  });
});
