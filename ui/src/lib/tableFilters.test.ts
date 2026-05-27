import { describe, expect, it } from "vitest";

import { matchesSelectFilter, matchesTextFilter, normalizeFilterText } from "./tableFilters";

describe("tableFilters", () => {
  it("normalizes filter text with trim and lowercase", () => {
    expect(normalizeFilterText("  LOTE 1  ")).toBe("lote 1");
    expect(normalizeFilterText(null)).toBe("");
    expect(normalizeFilterText(undefined)).toBe("");
  });

  it("matches select filters by exact normalized value", () => {
    expect(matchesSelectFilter(" LOTE 1 ", ["lote 1"])).toBe(true);
    expect(matchesSelectFilter("Lote 10", ["Lote 1"])).toBe(false);
  });

  it("matches numeric and string values as equivalent select options", () => {
    expect(matchesSelectFilter(10, ["10"])).toBe(true);
    expect(matchesSelectFilter("10", [10])).toBe(true);
  });

  it("matches text filters with partial case-insensitive search", () => {
    expect(matchesTextFilter("Lote 10", "lote 1")).toBe(true);
    expect(matchesTextFilter("Soja de invierno", "INVIERNO")).toBe(true);
    expect(matchesTextFilter("Trigo", "soja")).toBe(false);
  });
});
