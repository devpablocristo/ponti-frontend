import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Stock } from "./Stock";

const getStockMock = vi.fn();

vi.mock("@devpablocristo/modules-ui-data-display", () => ({
  DataTable: ({ columns, data }: { columns: Array<{ key: string }>; data: unknown[] }) => (
    <div>
      <div data-testid="datatable-columns">{columns.map((column) => column.key).join(",")}</div>
      <div data-testid="datatable-rows">{data.length}</div>
    </div>
  ),
}));

vi.mock("@devpablocristo/modules-ui-filters", () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock("../../../components/Card/IndicatorCard", () => ({
  IndicatorCard: ({ title, value }: { title: string; value: string }) => (
    <div data-testid="indicator-card">{title}:{value}</div>
  ),
}));

vi.mock("../../../hooks/useStock", () => ({
  default: () => ({
    getStock: getStockMock,
    stock: [
      {
        supply_id: 9,
        supply_name: "Urea",
        class_type: "Fertilizantes",
        supply_unit_id: 1,
        supply_unit_price: 4,
        entry_stock: 103,
        out_stock: 30,
        consumed: 7,
        stock_units: 66,
        real_stock_units: 70,
        stock_difference: 4,
        total_usd: 264,
        last_count_at: "2026-04-21T12:00:00Z",
        has_real_stock_count: true,
      },
    ],
    processing: false,
    error: null,
    summary: {
      total_kg: 103,
      total_lt: 0,
      total_usd: 264,
    },
    updateStock: vi.fn(),
    processingStock: false,
    errorStock: null,
    resultStock: null,
  }),
}));

vi.mock("../../../hooks/useWorkspaceFilters", () => ({
  useWorkspaceFilters: () => ({
    projectId: 7,
    filters: [],
    selectedCustomer: { id: 1, name: "Cliente" },
    selectedCampaignId: 5,
    customers: [{ id: 1, name: "Cliente" }],
  }),
}));

vi.mock("./CreateStockItem", () => ({
  default: ({
    projectId,
    drawerOpen,
  }: {
    projectId: number;
    drawerOpen: boolean;
  }) => (
    <div data-testid="create-stock-item">
      {projectId}:{String(drawerOpen)}
    </div>
  ),
}));

describe("Stock page", () => {
  it("renderiza la tabla por supply_id y sin columnas legacy", async () => {
    render(<Stock />);

    await waitFor(() => {
      expect(getStockMock).toHaveBeenCalledWith(7, "");
    });

    const columns = screen.getByTestId("datatable-columns").textContent ?? "";
    expect(columns).toContain("supply_name");
    expect(columns).toContain("out_stock");
    expect(columns).toContain("last_count_at");
    expect(columns).not.toContain("investor_name");
    expect(columns).not.toContain("close_date");

    expect(screen.getByTestId("datatable-rows")).toHaveTextContent("1");
    expect(screen.getByTestId("create-stock-item")).toHaveTextContent("7:false");
  });
});
