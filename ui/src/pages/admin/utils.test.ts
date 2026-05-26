import { describe, it, expect } from "vitest";
import {
  replaceSupplyIdsWithNames,
  DEFAULT_ITEM_ROW_COUNT,
} from "./utils";

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
