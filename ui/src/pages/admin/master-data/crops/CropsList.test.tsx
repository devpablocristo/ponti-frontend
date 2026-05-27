import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import * as ExcelJS from "exceljs";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialogProvider } from "../../../../hooks/useConfirmDialog";
import type { Crop } from "../../../../hooks/useCrops";
import CropsList from "./CropsList";

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

const mockWorkspaceFilters = vi.hoisted(() => ({
  state: {
    filters: [],
    selectedCustomer: undefined as { id: number; name: string } | undefined,
    selectedProject: undefined as { id: number; name: string } | undefined,
    selectedCampaignId: undefined as number | undefined,
    selectedField: undefined as { id: number; name: string; project_id: number } | undefined,
    campaigns: [] as Array<{ id: number; name: string; project_id: number }>,
    projectsDropdown: [] as Array<{ id: number; name: string }>,
  },
}));

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("../../../../hooks/useCrops", () => ({
  default: () => mockUseCrops.state,
}));

vi.mock("../../../../hooks/useWorkspaceFilters", () => ({
  useWorkspaceFilters: () => mockWorkspaceFilters.state,
}));

vi.mock("@/api/client", () => ({
  apiClient: mockApiClient,
}));

vi.mock("../../../../components/crud/ResponsiveTable", () => ({
  ResponsiveTable: ({
    data,
    columns,
  }: {
    data: Crop[];
    columns: Array<{ key: keyof Crop; render?: (value: unknown, item: Crop) => React.ReactNode }>;
  }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => (
              <td key={String(column.key)}>
                {column.render
                  ? column.render(row[column.key], row)
                  : String(row[column.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

function renderCropsList() {
  return render(
    <ConfirmDialogProvider>
      <CropsList />
    </ConfirmDialogProvider>
  );
}

async function createExcelFile(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cultivos");
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer as BlobPart], "cultivos.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("CropsList", () => {
  beforeEach(() => {
    mockUseCrops.state.crops = [];
    mockUseCrops.state.archivedCrops = [];
    mockUseCrops.state.processing = false;
    mockUseCrops.state.error = null;
    mockWorkspaceFilters.state.filters = [];
    mockWorkspaceFilters.state.selectedCustomer = undefined;
    mockWorkspaceFilters.state.selectedProject = undefined;
    mockWorkspaceFilters.state.selectedCampaignId = undefined;
    mockWorkspaceFilters.state.selectedField = undefined;
    mockWorkspaceFilters.state.campaigns = [];
    mockWorkspaceFilters.state.projectsDropdown = [];
    vi.clearAllMocks();
  });

  it("lists crops with proper display names and loads the catalog", async () => {
    mockUseCrops.state.crops = [{ id: 1, name: "poroto mung" }];

    renderCropsList();

    await waitFor(() => {
      expect(mockUseCrops.state.getCrops).toHaveBeenCalledWith("page=1&per_page=1000");
    });
    expect(screen.getByText("Poroto Mung")).toBeInTheDocument();
    expect(screen.getByText("Importar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeInTheDocument();
  });

  it("imports crop names from Excel and skips existing crops", async () => {
    mockUseCrops.state.crops = [{ id: 1, name: "soja" }];
    const { container } = renderCropsList();
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = await createExcelFile([["Nombre"], ["Soja"], ["Trigo"]]);
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUseCrops.state.createCrop).toHaveBeenCalledWith({ name: "Trigo" });
    });
    expect(mockUseCrops.state.createCrop).toHaveBeenCalledTimes(1);
  });

  it("filters crops by selected project context", async () => {
    mockUseCrops.state.crops = [
      { id: 1, name: "poroto mung" },
      { id: 2, name: "trigo" },
    ];
    mockWorkspaceFilters.state.selectedProject = { id: 10, name: "Jujuy Mea" };
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: {
        name: "Jujuy Mea",
        customer: { id: 1, name: "Agro Lajitas" },
        campaign: { id: 1, name: "2025-2026" },
        managers: [],
        investors: [],
        admin_cost_investors: [],
        admin_cost: 0,
        planned_cost: 0,
        updated_at: undefined,
        fields: [
          {
            id: 20,
            name: "Campo Norte",
            lease_type_id: 1,
            lease_type_percent: null,
            lease_type_value: null,
            investors: [],
            lots: [
              {
                id: 30,
                name: "Lote 1",
                hectares: 10,
                previous_crop_id: 0,
                current_crop_id: 2,
                current_crop_name: "trigo",
                previous_crop_name: "",
                season: "Invierno",
              },
            ],
          },
        ],
      },
    });

    renderCropsList();

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith("/projects/10");
    });

    await waitFor(() => {
      expect(screen.queryByText("Poroto Mung")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("checkbox", { name: "Seleccionar cultivo Trigo" })).toBeInTheDocument();
  });

  it("opens the create drawer from the empty state", () => {
    renderCropsList();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Cultivo" }));

    const dialog = screen.getByRole("dialog", { name: "Nuevo Cultivo" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox")).toHaveAttribute("name", "name");
  });
});
