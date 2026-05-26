import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArchivedDrawer } from "../crud/ArchivedDrawer";
import { ArchivedListPage } from "./ArchivedListPage";
import type { Column } from "../../pages/admin/types";

vi.mock("../../hooks/useWorkspaceFilters", () => ({
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

type ArchivedProjectRow = {
  id: number;
  customer: string;
  name: string;
  campaign: string;
  managers: string;
  investors: string;
};

const entity = { article: "el", singular: "proyecto", plural: "proyectos" };
const columns: Column<ArchivedProjectRow>[] = [
  { key: "customer", header: "Cliente/Sociedad" },
  { key: "name", header: "Proyecto" },
  { key: "campaign", header: "Campaña" },
  { key: "managers", header: "Responsable" },
  { key: "investors", header: "Inversores y aportes" },
];

describe("ArchivedListPage", () => {
  it("formats archived table headers and entity names for display", async () => {
    render(
      <ArchivedDrawer open title="Proyectos archivados" onClose={vi.fn()}>
        <ArchivedListPage<ArchivedProjectRow>
          columns={columns}
          data={[
            {
              id: 1,
              customer: "soalen srl 2",
              name: "graneros",
              campaign: "2026-2027",
              managers: "alvaro",
              investors: "soalen srl - 70%; bian - 30%",
            },
          ]}
          entity={entity}
          bulk
          getItemLabel={(item) => item.name}
          ignoreWorkspaceFilters
        />
      </ArchivedDrawer>,
    );

    expect(screen.getByText("Proyectos Archivados")).toBeInTheDocument();
    expect(screen.getByText("Cliente/Sociedad")).toBeInTheDocument();
    expect(screen.getByText("Inversores y Aportes")).toBeInTheDocument();
    expect(screen.getByText("Seleccionar Todo")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Soalen SRL 2")).toBeInTheDocument();
      expect(screen.getByText("Graneros")).toBeInTheDocument();
      expect(screen.getByText("2026-2027")).toBeInTheDocument();
      expect(screen.getByText("Alvaro")).toBeInTheDocument();
      expect(screen.getByText("Soalen SRL - 70%; Bian - 30%")).toBeInTheDocument();
    });
  });
});
