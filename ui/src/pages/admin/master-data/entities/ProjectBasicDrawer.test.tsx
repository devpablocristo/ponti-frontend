import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Project } from "../../../../hooks/useDatabase/projects/types";
import ProjectBasicDrawer from "./ProjectBasicDrawer";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiClient: mockApiClient,
}));

vi.mock("../../../../lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const completeProject: Project = {
  name: "Proyecto A",
  customer: { id: 1, actor_id: 11, name: "Cliente Uno" },
  campaign: { id: 20, name: "2025-2026" },
  managers: [{ id: 30, actor_id: 31, name: "Responsable Uno" }],
  investors: [{ id: 40, actor_id: 41, name: "Inversor Uno", percentage: 100 }],
  admin_cost_investors: [{ id: 40, actor_id: 41, name: "Inversor Uno", percentage: 100 }],
  admin_cost: 50,
  planned_cost: 100,
  fields: [
    {
      id: 50,
      name: "Campo Norte",
      lease_type_id: 1,
      lease_type_percent: 10,
      lease_type_value: null,
      investors: [{ id: 60, actor_id: 61, name: "Arrendatario Uno", percentage: 100 }],
      lots: [
        {
          id: 70,
          name: "Lote 1",
          hectares: 25,
          previous_crop_id: 80,
          previous_crop_name: "Maiz",
          current_crop_id: 81,
          current_crop_name: "Soja",
          season: "Verano",
        },
      ],
    },
  ],
  updated_at: "2026-05-01T00:00:00Z",
};

const customers = [{ id: 1, actor_id: 11, name: "Cliente Uno" }];
const campaigns = [{ id: 20, name: "2025-2026", project_id: 10 }];

describe("ProjectBasicDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.get.mockResolvedValue({ success: true, data: completeProject });
    mockApiClient.put.mockResolvedValue({ success: true, data: completeProject });
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: 99 } });
  });

  it("edita solo el nombre y preserva el resto del proyecto", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <ProjectBasicDrawer
        open
        mode="edit"
        projectId={10}
        project={completeProject}
        customers={customers}
        campaigns={campaigns}
        onSaved={onSaved}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText("Nombre del proyecto"), {
      target: { value: "Proyecto Editado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith("/projects/10", {
        ...completeProject,
        name: "Proyecto Editado",
      });
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it("crear requiere cliente, campaña y nombre antes de guardar", async () => {
    render(
      <ProjectBasicDrawer
        open
        mode="create"
        customers={customers}
        campaigns={campaigns}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Proyecto: ingresá un nombre.");

    fireEvent.change(screen.getByLabelText("Nombre del proyecto"), {
      target: { value: "Proyecto Nuevo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Seleccioná un cliente y una campaña existentes"
    );
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it("crea un proyecto mínimo con cliente y campaña existentes", async () => {
    render(
      <ProjectBasicDrawer
        open
        mode="create"
        customers={customers}
        campaigns={campaigns}
        onClose={vi.fn()}
      />
    );

    fireEvent.focus(screen.getByLabelText("Cliente / Sociedad"));
    fireEvent.click(await screen.findByText("Cliente Uno"));
    fireEvent.focus(screen.getByLabelText("Campaña"));
    fireEvent.click(await screen.findByText("2025-2026"));
    fireEvent.change(screen.getByLabelText("Nombre del proyecto"), {
      target: { value: "Proyecto Nuevo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith("/projects", {
        name: "Proyecto Nuevo",
        customer: { id: 1, actor_id: 11, name: "Cliente Uno" },
        campaign: { id: 20, name: "2025-2026" },
        managers: [],
        investors: [],
        admin_cost_investors: [],
        admin_cost: 0,
        planned_cost: 0,
        fields: [],
        updated_at: undefined,
      });
    });
  });

  it("no renderiza las secciones completas del editor de proyectos", () => {
    render(
      <ProjectBasicDrawer
        open
        mode="edit"
        projectId={10}
        project={completeProject}
        customers={customers}
        campaigns={campaigns}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Proyecto")).toBeInTheDocument();
    expect(screen.queryByText("Responsables")).not.toBeInTheDocument();
    expect(screen.queryByText("Inversores")).not.toBeInTheDocument();
    expect(screen.queryByText("Costo administrativo")).not.toBeInTheDocument();
    expect(screen.queryByText("Campos")).not.toBeInTheDocument();
    expect(screen.queryByText("Lotes")).not.toBeInTheDocument();
    expect(screen.queryByText("Cultivos")).not.toBeInTheDocument();
  });
});
