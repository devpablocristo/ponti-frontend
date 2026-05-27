import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useClientTableFilters } from "./dataDisplay";

type Row = {
  id: number;
  lot_name: string;
  crop_name: string;
};

const rows: Row[] = [
  { id: 1, lot_name: "LOTE 1", crop_name: "Trigo" },
  { id: 2, lot_name: "LOTE 10", crop_name: "Trigo" },
  { id: 3, lot_name: "LOTE 2", crop_name: "Soja" },
];

describe("useClientTableFilters", () => {
  it("filters array values as exact select filters", () => {
    const { result } = renderHook(() => useClientTableFilters<Row>({ rows }));

    act(() => {
      result.current.handleFilterChange({ lot_name: ["LOTE 1"] });
    });

    expect(result.current.filteredRows.map((row) => row.id)).toEqual([1]);
  });

  it("filters scalar values as partial text filters", () => {
    const { result } = renderHook(() => useClientTableFilters<Row>({ rows }));

    act(() => {
      result.current.handleFilterChange({ lot_name: "lote 1" });
    });

    expect(result.current.filteredRows.map((row) => row.id)).toEqual([1, 2]);
  });

  it("builds options by excluding the current column filter and applying the rest", () => {
    const { result } = renderHook(() => useClientTableFilters<Row>({ rows }));

    act(() => {
      result.current.handleFilterChange({
        lot_name: ["LOTE 1"],
        crop_name: ["Trigo"],
      });
    });

    expect(result.current.getFilterOptionsForColumn("lot_name")).toEqual(["LOTE 1", "LOTE 10"]);
    expect(result.current.getFilterOptionsForColumn("crop_name")).toEqual(["Trigo"]);
  });

  it("resets filters and notifies changes", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useClientTableFilters<Row>({ rows, onChange }));

    act(() => {
      result.current.handleFilterChange({ lot_name: ["LOTE 1"] });
    });
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual({});
    expect(result.current.filteredRows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
