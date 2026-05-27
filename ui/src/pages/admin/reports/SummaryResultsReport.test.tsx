import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SummaryResultsReport } from "./SummaryResultsReport";

const summaryData = {
  project_id: 1,
  project_name: "Jujuy Mealla Acheral",
  customer_id: 1,
  customer_name: "Agro Lajitas",
  campaign_id: 1,
  campaign_name: "2025-2026",
  crops: [
    {
      crop_id: 7,
      crop_name: "poroto mung",
      surface_ha: "10",
      net_income_usd: "0",
      direct_costs_usd: "0",
      rent_usd: "0",
      structure_usd: "0",
      total_invested_usd: "0",
      operating_result_usd: "0",
      crop_return_pct: "0",
    },
  ],
  totals: {
    total_surface_ha: "10",
    total_net_income_usd: "0",
    total_direct_costs_usd: "0",
    total_rent_usd: "0",
    total_structure_usd: "0",
    total_invested_project_usd: "0",
    total_operating_result_usd: "0",
    project_return_pct: "0",
  },
  general_crops: {
    total_surface_ha: "10",
    total_net_income_usd: "0",
    total_direct_costs_usd: "0",
    total_rent_usd: "0",
    total_structure_usd: "0",
    total_invested_project_usd: "0",
    total_operating_result_usd: "0",
    project_return_pct: "0",
  },
};

const mockReporting = vi.hoisted(() => ({
  getSummaryResultsReportingData: vi.fn(),
  getFieldCropReportingData: vi.fn(),
}));

vi.mock("../../../hooks/useWorkspaceFilters", () => ({
  useWorkspaceFilters: () => ({
    filters: [],
    projectId: 1,
    selectedCustomer: { id: 1, name: "Agro Lajitas" },
    selectedCampaignId: 1,
    workspaceReady: true,
    loading: {
      customers: false,
      projects: false,
      campaigns: false,
      fields: false,
    },
  }),
}));

vi.mock("../../../hooks/useReporting", () => ({
  default: () => ({
    summaryResultsReportingData: summaryData,
    fieldCropReportingData: null,
    processing: false,
    error: null,
    getSummaryResultsReportingData: mockReporting.getSummaryResultsReportingData,
    getFieldCropReportingData: mockReporting.getFieldCropReportingData,
  }),
}));

vi.mock("react-to-pdf", () => ({
  usePDF: () => ({
    toPDF: vi.fn(),
    targetRef: { current: null },
  }),
}));

describe("SummaryResultsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the all-crops label instead of the raw zero id", () => {
    render(<SummaryResultsReport />);

    expect(screen.getByLabelText("Cultivo")).toHaveValue("Todos");
  });
});
