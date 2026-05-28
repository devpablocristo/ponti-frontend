import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Actor } from "../../../../hooks/useActors";
import type { Crop } from "../../../../hooks/useCrops";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import FieldFormDrawer from "./FieldFormDrawer";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

const mockNotify = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiClient: mockApiClient,
}));

vi.mock("../../../../lib/notify", () => ({
  notify: mockNotify,
}));

const project: Project = {
  name: "Proyecto A",
  customer: { id: 1, actor_id: 1, name: "Cliente Uno" },
  campaign: { id: 20, name: "2025-2026" },
  managers: [{ id: 8, name: "Gero" }],
  investors: [{ id: 9, actor_id: 3, name: "Olega SA", percentage: 63 }],
  admin_cost_investors: [{ id: 10, actor_id: 4, name: "Agro SA", percentage: 100 }],
  admin_cost: 50,
  planned_cost: 588,
  updated_at: undefined,
  fields: [
    {
      id: 30,
      name: "Campo Alegre",
      lease_type_id: 3,
      lease_type_name: "Arriendo Fijo",
      lease_type_percent: null,
      lease_type_value: 103,
      investors: [{ id: 0, actor_id: 2, name: "Olega SA", percentage: 100 }],
      lots: [
        {
          id: 40,
          name: "Lote 1",
          hectares: 150,
          previous_crop_id: 60,
          previous_crop_name: "Poroto Rojo",
          current_crop_id: 61,
          current_crop_name: "Poroto Mung",
          season: "Verano",
        },
      ],
    },
  ],
};

const actors: Actor[] = [
  {
    id: 2,
    actor_kind: "organization",
    display_name: "Olega SA",
    roles: ["arrendatario"],
  },
];

const crops: Crop[] = [
  { id: 60, name: "Poroto Rojo" },
  { id: 61, name: "Poroto Mung" },
];

function renderDrawer(overrides?: Partial<ComponentProps<typeof FieldFormDrawer>>) {
  return render(
    <FieldFormDrawer
      open
      title="Editar Campo"
      projectId={10}
      fieldId={30}
      project={project}
      actors={actors}
      crops={crops}
      seasons={[{ id: 4, name: "Verano" }]}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      {...overrides}
    />,
  );
}

describe("FieldFormDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.get.mockResolvedValue({
      success: true,
      message: "",
      data: {
        rentTypes: [{ id: 3, name: "Arriendo Fijo" }],
      },
    });
    mockApiClient.put.mockResolvedValue({
      success: true,
      message: "",
      data: project,
    });
  });

  it("muestra solo el editor acotado de campo", async () => {
    renderDrawer();

    expect(screen.getByText("Editar Campo")).toBeInTheDocument();
    expect(screen.getByText("Campo")).toBeInTheDocument();
    expect(screen.getByText("Tipo de Arriendo")).toBeInTheDocument();
    expect(screen.getByText("Arrendatario")).toBeInTheDocument();
    expect(screen.getByText("Lotes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Campo Alegre")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lote 1")).toBeInTheDocument();

    expect(screen.queryByText("Proyecto")).not.toBeInTheDocument();
    expect(screen.queryByText("Responsables")).not.toBeInTheDocument();
    expect(screen.queryByText("Inversores")).not.toBeInTheDocument();
    expect(screen.queryByText("Costo administrativo")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith("/form-options");
    });
  });

  it("guarda solo el campo editado preservando el proyecto", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderDrawer({ onSaved, onClose });

    fireEvent.change(screen.getByDisplayValue("Campo Alegre"), {
      target: { value: "Campo Nuevo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith(
        "/projects/10",
        expect.objectContaining({
          name: "Proyecto A",
          customer: project.customer,
          campaign: project.campaign,
          managers: project.managers,
          investors: project.investors,
          fields: [
            expect.objectContaining({
              id: 30,
              name: "Campo Nuevo",
              lease_type_id: 3,
              lease_type_value: 103,
              lots: [expect.objectContaining({ id: 40, name: "Lote 1" })],
            }),
          ],
        }),
      );
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
