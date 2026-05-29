import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Project } from "../../../hooks/useDatabase/projects/types";
import ProjectEditor from "./ProjectEditor";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiClient: mockApiClient,
}));

vi.mock("../../../lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../../login/context/useSelection", () => ({
  useSelection: () => ({
    setCustomer: vi.fn(),
    setProject: vi.fn(),
    projectId: null,
    setProjectId: vi.fn(),
    allSelection: {},
  }),
}));

const projectDetail: Project = {
  name: "Jujuy Mealla Acheral",
  customer: { id: 1, actor_id: 101, name: "Agro Lajitas" },
  campaign: { id: 20, name: "2025-2026" },
  managers: [{ id: 201, actor_id: 301, name: "Gero" }],
  investors: [{ id: 202, actor_id: 302, name: "Olega SA", percentage: 100 }],
  admin_cost_investors: [{ id: 203, actor_id: 303, name: "E Vedoya", percentage: 100 }],
  admin_cost: 50,
  planned_cost: 588,
  fields: [
    {
      id: 50,
      name: "Campo Norte",
      lease_type_id: 1,
      lease_type_percent: null,
      lease_type_value: null,
      investors: [],
      lots: [
        {
          id: 60,
          name: "Lote 1",
          hectares: 10,
          previous_crop_id: 80,
          previous_crop_name: "Maiz",
          current_crop_id: 81,
          current_crop_name: "Soja",
          season: "Verano",
        },
      ],
    },
  ],
  updated_at: undefined,
};

function mockProjectEditorRequests() {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.startsWith("/customers")) {
      return Promise.resolve({
        success: true,
        data: {
          data: [
            { id: 1, actor_id: 101, name: "Agro Lajitas" },
            { id: 2, actor_id: 102, name: "Olega SA" },
          ],
        },
      });
    }
    if (url.startsWith("/actors")) {
      return Promise.resolve({
        success: true,
        data: {
          data: [
            { id: 101, display_name: "Agro Lajitas", roles: ["cliente"] },
            { id: 102, display_name: "Olega SA", roles: ["cliente"] },
            { id: 301, display_name: "Gero", roles: ["responsable"] },
            { id: 302, display_name: "Olega SA", roles: ["inversor"] },
            { id: 303, display_name: "E Vedoya", roles: ["inversor"] },
          ],
        },
      });
    }
    if (url.startsWith("/campaigns")) {
      return Promise.resolve({
        success: true,
        data: { data: [{ id: 20, name: "2025-2026" }] },
      });
    }
    if (url.startsWith("/fields")) {
      return Promise.resolve({
        success: true,
        data: { data: [{ id: 50, name: "Campo Norte", project_id: 10 }] },
      });
    }
    if (url.startsWith("/lots")) {
      return Promise.resolve({
        success: true,
        data: { data: [{ id: 60, lot_name: "Lote 1", field_id: 50 }] },
      });
    }
    if (url.startsWith("/crops")) {
      return Promise.resolve({
        success: true,
        data: {
          data: [
            { id: 80, name: "Maiz" },
            { id: 81, name: "Soja" },
          ],
        },
      });
    }
    if (url.startsWith("/form-options")) {
      return Promise.resolve({
        success: true,
        data: { rentTypes: [{ id: 1, name: "Porcentaje" }] },
      });
    }
    if (url.startsWith("/projects/customers/2")) {
      return Promise.resolve({
        success: true,
        data: { data: [{ id: 22, name: "Olega Norte" }] },
      });
    }
    if (url.startsWith("/projects/customers/1")) {
      return Promise.resolve({
        success: true,
        data: { data: [{ id: 10, name: "Jujuy Mealla Acheral" }] },
      });
    }
    if (url.startsWith("/projects/22")) {
      return Promise.resolve({
        success: true,
        data: {
          ...projectDetail,
          name: "Olega Norte",
          customer: { id: 2, actor_id: 102, name: "Olega SA" },
        },
      });
    }
    if (url.startsWith("/projects/10")) {
      return Promise.resolve({ success: true, data: projectDetail });
    }
    return Promise.resolve({ success: true, data: {} });
  });
}

function renderProjectEditor(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ProjectEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectEditorRequests();
    mockApiClient.put.mockResolvedValue({ success: true, data: projectDetail });
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: 99 } });
  });

  it("muestra dropdown en Nombre del proyecto al editar con scope", async () => {
    renderProjectEditor(
      <ProjectEditor
        embedded
        customerId={1}
        initialProjectId={10}
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        contextProject={{ id: 10, name: "Jujuy Mealla Acheral" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
      />
    );

    const projectInput = await screen.findByLabelText("Nombre del proyecto");
    await waitFor(() => {
      expect(projectInput).toHaveValue("Jujuy Mealla Acheral");
    });

    fireEvent.focus(projectInput);

    expect(projectInput).toHaveValue("");
    expect(screen.getByTestId("project_name-smart-entity-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Jujuy Mealla Acheral")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Administrar/i })).not.toBeInTheDocument();
  });

  it("muestra todos los clientes activos en el dropdown de Cliente / Sociedad", async () => {
    renderProjectEditor(
      <ProjectEditor
        embedded
        customerId={1}
        initialProjectId={10}
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        contextProject={{ id: 10, name: "Jujuy Mealla Acheral" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
      />
    );

    const customerInput = await screen.findByLabelText("Cliente / Sociedad");
    await waitFor(() => {
      expect(customerInput).toHaveValue("Agro Lajitas");
    });

    fireEvent.focus(customerInput);

    expect(customerInput).toHaveValue("");
    expect(screen.getByTestId("project_customer-smart-entity-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Agro Lajitas")).toBeInTheDocument();
    expect(screen.getByText("Olega SA")).toBeInTheDocument();

    fireEvent.change(customerInput, { target: { value: "ole" } });

    expect(screen.queryByText("Agro Lajitas")).not.toBeInTheDocument();
    expect(screen.getByText("Olega SA")).toBeInTheDocument();
  });

  it("al elegir cliente muestra solo proyectos de ese cliente y solo permite seleccionar", async () => {
    renderProjectEditor(
      <ProjectEditor
        embedded
        customerId={1}
        initialProjectId={10}
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        contextProject={{ id: 10, name: "Jujuy Mealla Acheral" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
      />
    );

    const customerInput = await screen.findByLabelText("Cliente / Sociedad");
    await waitFor(() => {
      expect(customerInput).toHaveValue("Agro Lajitas");
    });

    fireEvent.focus(customerInput);
    fireEvent.click(screen.getByText("Olega SA"));

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith("/projects/customers/2?page=1&per_page=1000");
    });

    const projectInput = screen.getByLabelText("Nombre del proyecto");
    fireEvent.focus(projectInput);

    expect(projectInput).toHaveValue("");
    expect(screen.getByTestId("project_name-smart-entity-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Olega Norte")).toBeInTheDocument();
    expect(screen.queryByText("Jujuy Mealla Acheral")).not.toBeInTheDocument();

    fireEvent.change(projectInput, { target: { value: "nuevo proyecto" } });

    expect(projectInput).toHaveValue("nuevo proyecto");
    expect(screen.queryByText("Olega Norte")).not.toBeInTheDocument();
  });

  it("muestra dropdown en Nombre del proyecto al crear y no permite escribir uno nuevo", async () => {
    renderProjectEditor(
      <ProjectEditor
        embedded
        createNewProject
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
      />
    );

    const projectInput = await screen.findByLabelText("Nombre del proyecto");
    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith("/form-options");
    });
    fireEvent.focus(projectInput);

    expect(screen.getByTestId("project_name-smart-entity-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Jujuy Mealla Acheral")).toBeInTheDocument();

    fireEvent.change(projectInput, { target: { value: "Nuevo Proyecto Norte" } });

    expect(projectInput).toHaveValue("Nuevo Proyecto Norte");
    fireEvent.mouseDown(document.body);

    expect(projectInput).toHaveValue("");
  });

  it("guarda el proyecto existente con PUT y no crea entidades", async () => {
    const onSaved = vi.fn();
    renderProjectEditor(
      <ProjectEditor
        embedded
        customerId={1}
        initialProjectId={10}
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        contextProject={{ id: 10, name: "Jujuy Mealla Acheral" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
        onSaved={onSaved}
      />
    );

    const projectInput = await screen.findByLabelText("Nombre del proyecto");
    await waitFor(() => {
      expect(projectInput).toHaveValue("Jujuy Mealla Acheral");
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith(
        "/projects/10",
        expect.objectContaining({
          name: "jujuy mealla acheral",
          customer: expect.objectContaining({ id: 1, name: "agro lajitas" }),
          campaign: expect.objectContaining({ id: 20, name: "2025-2026" }),
        })
      );
      expect(onSaved).toHaveBeenCalled();
    });
    expect(mockApiClient.post).not.toHaveBeenCalledWith("/projects", expect.anything());
  });

  it("no permite crear proyecto cuando las relaciones son selection-only", async () => {
    renderProjectEditor(
      <ProjectEditor
        embedded
        createNewProject
        selectionOnlyRelations
        initialCustomer={{ id: 1, actor_id: 101, name: "Agro Lajitas" }}
        initialCampaign={{ id: 20, name: "2025-2026" }}
        projectNameScope={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
      />
    );

    await screen.findByLabelText("Nombre del proyecto");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(mockApiClient.post).not.toHaveBeenCalledWith("/projects", expect.anything());
  });
});
