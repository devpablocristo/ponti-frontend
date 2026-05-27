import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialogProvider } from "../../../../hooks/useConfirmDialog";
import type { Crop } from "../../../../hooks/useCrops";
import ArchivedCrops from "./ArchivedCrops";

const mockUseCrops = vi.hoisted(() => ({
  state: {
    crops: [] as Crop[],
    archivedCrops: [] as Crop[],
    total: 0,
    archivedTotal: 0,
    processing: false,
    error: null as string | null,
    getCrops: vi.fn(),
    getArchivedCrops: vi.fn(),
    getCrop: vi.fn(),
    createCrop: vi.fn(),
    updateCrop: vi.fn(),
    archiveCrop: vi.fn(),
    restoreCrop: vi.fn(),
    hardDeleteCrop: vi.fn(),
  },
}));

vi.mock("../../../../hooks/useCrops", () => ({
  default: () => mockUseCrops.state,
}));

vi.mock("../../../../hooks/useWorkspaceFilters", () => ({
  useWorkspaceFilters: vi.fn(() => ({
    selectedCustomer: undefined,
    selectedProject: undefined,
    selectedCampaignId: undefined,
    selectedField: undefined,
    campaigns: [],
  })),
}));

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(async () => ({ data: { data: [] } })),
  },
}));

describe("ArchivedCrops", () => {
  beforeEach(() => {
    mockUseCrops.state.archivedCrops = [];
    mockUseCrops.state.processing = false;
    mockUseCrops.state.error = null;
    vi.clearAllMocks();
  });

  it("loads archived crops and renders them", async () => {
    mockUseCrops.state.archivedCrops = [{ id: 4, name: "maiz tardio" }];

    render(
      <ConfirmDialogProvider>
        <ArchivedCrops />
      </ConfirmDialogProvider>,
    );

    await waitFor(() => {
      expect(mockUseCrops.state.getArchivedCrops).toHaveBeenCalledWith("page=1&per_page=1000");
    });
    expect(screen.getByText("Maiz Tardio")).toBeInTheDocument();
  });
});
