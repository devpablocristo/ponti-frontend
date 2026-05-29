import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GeneralEntities from "./GeneralEntities";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  actors: {
    actors: [] as Array<{
      id: number;
      actor_kind: "organization";
      display_name: string;
      roles: string[];
    }>,
    getActors: vi.fn(),
    createActor: vi.fn(),
    updateActor: vi.fn(),
    archiveActor: vi.fn(),
    processing: false,
  },
  customers: {
    customers: [] as Array<{ id: number; actor_id?: number; name: string }>,
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    archiveCustomer: vi.fn(),
    processing: false,
  },
  projects: {
    projects: [] as Array<{
      id: number;
      name: string;
      customer: string;
      campaign: string;
      managers: string;
      investors: string;
      fields: Array<{ name: string; lease_type: string; hectares: string; crops: string }>;
    }>,
    getProjects: vi.fn(),
    deleteProject: vi.fn(),
    processing: false,
  },
  campaigns: {
    campaigns: [] as Array<{ id: number; name: string; project_id: number }>,
    getCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    archiveCampaign: vi.fn(),
    processing: false,
  },
  fields: {
    fields: [] as Array<{ id: number; name: string; project_id: number }>,
    getFields: vi.fn(),
    archiveField: vi.fn(),
    processing: false,
  },
  lots: {
    lots: [] as Array<Record<string, unknown>>,
    getLots: vi.fn(),
    archiveLot: vi.fn(),
    processing: false,
  },
  crops: {
    crops: [] as Array<{ id: number; name: string }>,
    getCrops: vi.fn(),
    createCrop: vi.fn(),
    updateCrop: vi.fn(),
    archiveCrop: vi.fn(),
    processing: false,
  },
  providers: {
    providers: [] as Array<{ id: number; name: string }>,
    getProviders: vi.fn(),
    processing: false,
  },
  supplyMovements: {
    supplyMovements: [] as Array<Record<string, unknown>>,
    getSupplyMovements: vi.fn(),
    processing: false,
  },
  managers: {
    managers: [] as Array<{ id: number; name: string; actor_id?: number }>,
    getManagers: vi.fn(),
    archiveManager: vi.fn(),
  },
  investors: {
    investors: [] as Array<{ id: number; name: string; actor_id?: number }>,
    getInvestors: vi.fn(),
    archiveInvestor: vi.fn(),
  },
  confirm: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiClient: mockApiClient,
}));

vi.mock("../../../../hooks/useActors", () => ({
  default: () => hookState.actors,
}));

vi.mock("../../../../hooks/useCustomers", () => ({
  default: () => hookState.customers,
}));

vi.mock("../../../../hooks/useDatabase/projects", () => ({
  default: () => hookState.projects,
}));

vi.mock("../../../../hooks/useCampaigns", () => ({
  default: () => hookState.campaigns,
}));

vi.mock("../../../../hooks/useFields", () => ({
  default: () => hookState.fields,
}));

vi.mock("../../../../hooks/useLots", () => ({
  default: () => hookState.lots,
}));

vi.mock("../../../../hooks/useCrops", () => ({
  default: () => hookState.crops,
}));

vi.mock("../../../../hooks/useProviders", () => ({
  default: () => hookState.providers,
}));

vi.mock("../../../../hooks/useSupplyMovements", () => ({
  default: () => hookState.supplyMovements,
}));

vi.mock("../../../../hooks/useManagers", () => ({
  default: () => hookState.managers,
}));

vi.mock("../../../../hooks/useInvestors", () => ({
  default: () => hookState.investors,
}));

vi.mock("../../../../hooks/useConfirmDialog", () => ({
  useConfirmDialog: () => hookState.confirm,
}));

vi.mock("../../../login/context/useSelection", () => ({
  useSelection: () => ({ seasons: [{ id: 1, name: "Verano" }] }),
}));

vi.mock("../actors/ActorFormDrawer", () => ({
  default: ({
    open,
    actor,
    defaultRoles,
    onSubmit,
  }: {
    open: boolean;
    actor: { actor_kind?: "organization"; roles?: string[] } | null;
    defaultRoles?: string[];
    onSubmit: (input: Record<string, unknown>) => void;
  }) =>
    open ? (
      <div data-testid="actor-form-drawer">
        Actor drawer
        <button
          type="button"
          onClick={() =>
            onSubmit({
              actor_kind: actor?.actor_kind ?? "organization",
              display_name: "Cliente Editado",
              roles: actor?.roles ?? defaultRoles ?? ["cliente"],
            })
          }
        >
          Guardar actor mock
        </button>
      </div>
    ) : null,
}));

vi.mock("../actors/ActorsList", () => ({
  default: ({
    rolePreset,
    allowCreate,
    selectionMode,
  }: {
    rolePreset?: string;
    allowCreate?: boolean;
    selectionMode?: { label: string; entityLabel?: string };
  }) => (
    <div data-testid={`actors-list-${rolePreset ?? "all"}`}>
      Actors list {selectionMode?.label ?? ""} {selectionMode?.entityLabel ?? ""}{" "}
      {allowCreate ? "create-enabled" : "create-disabled"}
    </div>
  ),
}));

vi.mock("../campaigns/CampaignFormDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="campaign-form-drawer">Campaign drawer</div> : null,
}));

vi.mock("../crops/CropFormDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="crop-form-drawer">Crop drawer</div> : null,
}));

vi.mock("../crops/CropsList", () => ({
  default: ({ selectionOnly }: { selectionOnly?: boolean }) => (
    <div data-testid="crops-list">{selectionOnly ? "selection-only" : "catalog-enabled"}</div>
  ),
}));

vi.mock("../fields/FieldsList", () => ({
  default: ({
    selectionOnly,
    selectionMode,
  }: {
    selectionOnly?: boolean;
    selectionMode?: { label: string };
  }) => (
    <div data-testid="fields-list">
      Fields list {selectionMode?.label ?? ""}{" "}
      {selectionOnly ? "selection-only" : "catalog-enabled"}
    </div>
  ),
}));

vi.mock("../../lots/EmbeddedLotsList", () => ({
  default: ({
    selectionOnly,
    selectionMode,
  }: {
    selectionOnly?: boolean;
    selectionMode?: { label: string };
  }) => (
    <div data-testid="embedded-lots-list">
      Lots list {selectionMode?.label ?? ""} {selectionOnly ? "selection-only" : "catalog-enabled"}
    </div>
  ),
}));

vi.mock("./ProjectBasicDrawer", () => ({
  default: ({
    open,
    mode,
    projectId,
  }: {
    open: boolean;
    mode: "create" | "edit";
    projectId?: number | null;
  }) =>
    open ? (
      <div data-testid="project-basic-drawer">
        Project basic drawer {mode} {projectId ?? "new"}
      </div>
    ) : null,
}));

vi.mock("./FieldBasicDrawer", () => ({
  default: ({
    open,
    mode,
    fieldId,
  }: {
    open: boolean;
    mode: "create" | "edit";
    fieldId?: number | null;
  }) =>
    open ? (
      <div data-testid="field-basic-drawer">
        Field basic drawer {mode} {fieldId ?? "new"}
      </div>
    ) : null,
}));

vi.mock("./LotBasicDrawer", () => ({
  default: ({
    open,
    mode,
    lot,
    fieldId,
  }: {
    open: boolean;
    mode: "create" | "edit";
    lot?: { lot_name?: string } | null;
    fieldId?: number | null;
  }) =>
    open ? (
      <div data-testid="lot-basic-drawer">
        Lot basic drawer {mode} {lot?.lot_name ?? fieldId ?? "new"}
      </div>
    ) : null,
}));

vi.mock("../actors/ArchivedActorsByRole", () => ({
  default: () => <div>Archived actors</div>,
}));

vi.mock("../campaigns/ArchivedCampaigns", () => ({ default: () => <div /> }));
vi.mock("../crops/ArchivedCrops", () => ({ default: () => <div /> }));
vi.mock("../fields/ArchivedFields", () => ({ default: () => <div /> }));
vi.mock("../lots/ArchivedLots", () => ({ default: () => <div /> }));
vi.mock("../projects/ArchivedProjects", () => ({ default: () => <div /> }));

const projectDetail = {
  name: "Proyecto A",
  customer: { id: 1, actor_id: 1, name: "Cliente Uno" },
  campaign: { id: 20, name: "2025-2026" },
  managers: [],
  investors: [],
  admin_cost_investors: [],
  admin_cost: 0,
  planned_cost: 0,
  fields: [
    {
      id: 30,
      name: "Campo Norte",
      lease_type_id: 1,
      lease_type_percent: null,
      lease_type_value: null,
      investors: [],
      lots: [
        {
          id: 40,
          name: "Lote 1",
          hectares: 10,
          previous_crop_id: 60,
          previous_crop_name: "Maiz",
          current_crop_id: 61,
          current_crop_name: "Soja",
          season: "Verano",
        },
      ],
    },
  ],
  updated_at: undefined,
};

function resetState() {
  hookState.actors.actors = [
    { id: 1, actor_kind: "organization", display_name: "Cliente Uno", roles: ["cliente"] },
  ];
  hookState.customers.customers = [{ id: 1, actor_id: 1, name: "Cliente Uno" }];
  hookState.projects.projects = [
    {
      id: 10,
      name: "Proyecto A",
      customer: "Cliente Uno",
      campaign: "2025-2026",
      managers: "",
      investors: "",
      fields: [{ name: "Campo Norte", lease_type: "", hectares: "10", crops: "Soja" }],
    },
  ];
  hookState.campaigns.campaigns = [{ id: 20, name: "2025-2026", project_id: 10 }];
  hookState.fields.fields = [{ id: 30, name: "Campo Norte", project_id: 10 }];
  hookState.lots.lots = [
    {
      id: 40,
      project_id: 10,
      field_id: 30,
      project_name: "Proyecto A",
      field_name: "Campo Norte",
      lot_name: "Lote 1",
      previous_crop: "Maiz",
      previous_crop_id: 60,
      current_crop: "Soja",
      current_crop_id: 61,
      variety: "",
      hectares: "10",
      sowed_area: "10",
      harvest_date: null,
      harvested_area: "0",
      dates: [],
      tons: "0",
      yield_tn_per_ha: "0",
      income_net_per_ha: "0",
      cost_usd_per_ha: "0",
      rent_per_ha: "0",
      admin_cost: "0",
      active_total_per_ha: "0",
      operating_result_per_ha: "0",
      season: "Verano",
    },
  ];
  hookState.crops.crops = [
    { id: 60, name: "Maiz" },
    { id: 61, name: "Soja" },
  ];
  hookState.providers.providers = [];
  hookState.supplyMovements.supplyMovements = [];
  hookState.managers.managers = [];
  hookState.investors.investors = [];
  hookState.actors.createActor.mockResolvedValue({
    id: 99,
    actor_kind: "organization",
    display_name: "Cliente Editado",
    roles: ["cliente"],
  });
  hookState.actors.updateActor.mockResolvedValue({
    id: 1,
    actor_kind: "organization",
    display_name: "Cliente Editado",
    roles: ["cliente"],
  });
  hookState.customers.createCustomer.mockResolvedValue({
    id: 99,
    actor_id: 99,
    name: "Cliente Editado",
  });
  hookState.customers.updateCustomer.mockResolvedValue(undefined);
  hookState.confirm.mockResolvedValue(true);
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.startsWith("/customers")) {
      return Promise.resolve({ data: { data: hookState.customers.customers } });
    }
    if (url.startsWith("/actors")) {
      return Promise.resolve({ data: { data: hookState.actors.actors } });
    }
    if (url.startsWith("/campaigns")) {
      return Promise.resolve({ data: { data: hookState.campaigns.campaigns } });
    }
    if (url.startsWith("/fields")) {
      return Promise.resolve({ data: { data: hookState.fields.fields } });
    }
    if (url.startsWith("/lots")) {
      return Promise.resolve({ data: { data: hookState.lots.lots } });
    }
    if (url.startsWith("/crops")) {
      return Promise.resolve({ data: { data: hookState.crops.crops } });
    }
    if (url.startsWith("/form-options")) {
      return Promise.resolve({ data: { rentTypes: [] } });
    }
    if (url.startsWith("/projects/10")) {
      return Promise.resolve({ data: projectDetail });
    }
    if (url.startsWith("/projects/customers/1") || url.startsWith("/projects")) {
      return Promise.resolve({
        data: {
          data: hookState.projects.projects.map((project) => ({
            id: project.id,
            name: project.name,
          })),
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
}

function renderGeneralEntities() {
  return render(
    <MemoryRouter>
      <GeneralEntities />
    </MemoryRouter>
  );
}

describe("GeneralEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it("muestra filtros en orden correcto y filas", async () => {
    renderGeneralEntities();

    expect(screen.getByLabelText("Cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Proyecto")).toBeInTheDocument();
    expect(screen.getByLabelText("Inversor")).toBeInTheDocument();
    expect(screen.getByLabelText("Campaña")).toBeInTheDocument();
    expect(screen.getByLabelText("Proveedores")).toBeInTheDocument();
    expect(screen.getByLabelText("Responsable")).toBeInTheDocument();
    expect(screen.getByLabelText("Arrendatario")).toBeInTheDocument();
    expect(screen.getByLabelText("Campo")).toBeInTheDocument();
    expect(screen.getByLabelText("Lote")).toBeInTheDocument();
    expect(screen.getByLabelText("Cultivo")).toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));

    expect(screen.getByTestId("entity-catalog-project-module")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Proyecto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nuevo Proyecto/i })).toBeInTheDocument();
  });

  it("cambia Nuevo según la primera entidad en Buscar", () => {
    renderGeneralEntities();

    expect(screen.getByRole("button", { name: /Nuevo Cliente/i })).toBeInTheDocument();

    for (const label of ["Cliente", "Proyecto", "Inversor", "Campaña"]) {
      fireEvent.focus(screen.getByLabelText(label));
      fireEvent.click(screen.getByText("Todos"));
    }

    expect(screen.getByRole("button", { name: /Nuevo Proveedor/i })).toBeInTheDocument();
  });

  it("seleccionar filtros no abre editor", () => {
    renderGeneralEntities();

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));

    expect(screen.queryByTestId("actor-form-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lot-basic-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("field-basic-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("project-basic-drawer")).not.toBeInTheDocument();
  });

  it("renderiza el módulo congelado tipo drawer y no tarjetas", async () => {
    const { container } = renderGeneralEntities();

    expect(screen.getByTestId("entity-catalog-project-module")).toBeInTheDocument();
    expect(screen.queryByTestId("entity-catalog-editor")).not.toBeInTheDocument();
    expect(container.querySelector("article")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Proyecto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Responsables" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inversores" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lotes" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Arrendatario").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Administrar Cultivos" })).toBeInTheDocument();
  });

  it("oculta la edición de valores operativos en el catálogo", async () => {
    renderGeneralEntities();

    const module = screen.getByTestId("entity-catalog-project-module");
    await screen.findByRole("heading", { name: "Proyecto" });

    await waitFor(() => {
      const plannedCostInput = module.querySelector('[name="planned_cost"]');
      const adminCostInput = module.querySelector('[name="admin_cost"]');
      expect(plannedCostInput).toBeInTheDocument();
      expect(adminCostInput).toBeInTheDocument();
      expect(plannedCostInput).not.toBeVisible();
      expect(adminCostInput).not.toBeVisible();
      expect(within(module).getByText("Hectáreas")).not.toBeVisible();
      expect(within(module).getByText("Tipo de Arriendo")).not.toBeVisible();
      expect(within(module).getByText("Cultivo Actual")).not.toBeVisible();
      expect(within(module).getByText("Cultivo Anterior")).not.toBeVisible();
      expect(within(module).getByText("Periodo")).not.toBeVisible();
      expect(
        within(module).queryByRole("heading", { name: "Costo administrativo" })
      ).not.toBeInTheDocument();
    });
  });

  it("click afuera deja el filtro abierto en Buscar como sin selección", async () => {
    renderGeneralEntities();

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));
    expect(screen.getByRole("button", { name: /Nuevo Proyecto/i })).toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Nuevo Cliente/i })).toBeInTheDocument();
    });
  });

  it("muestra el filtro seleccionado con reglas de visualización de nombres", async () => {
    hookState.actors.actors = [
      { id: 1, actor_kind: "organization", display_name: "agro lajitas srl", roles: ["cliente"] },
    ];
    hookState.customers.customers = [{ id: 1, actor_id: 1, name: "agro lajitas srl" }];
    hookState.projects.projects = [];

    renderGeneralEntities();

    const customerFilter = screen.getByLabelText("Cliente");
    fireEvent.focus(customerFilter);
    await waitFor(() => {
      expect(screen.getAllByText("Agro Lajitas SRL").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText("Agro Lajitas SRL")[0]);

    expect(customerFilter).toHaveValue("Agro Lajitas SRL");
    expect(screen.getByDisplayValue("Agro Lajitas SRL")).toBeInTheDocument();
    expect(screen.queryByText("agro lajitas srl")).not.toBeInTheDocument();
  });

  it("limpia filtros seleccionados cuando la entidad deja de estar activa", async () => {
    const { rerender } = renderGeneralEntities();

    const customerFilter = screen.getByLabelText("Cliente");
    fireEvent.focus(customerFilter);
    await waitFor(() => {
      expect(screen.getAllByText("Cliente Uno").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText("Cliente Uno")[0]);

    expect(customerFilter).toHaveValue("Cliente Uno");
    expect(screen.getByRole("button", { name: /Nuevo Proyecto/i })).toBeInTheDocument();

    hookState.customers.customers = [];
    rerender(
      <MemoryRouter>
        <GeneralEntities />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Cliente")).toHaveValue("");
    });
    expect(screen.getByRole("button", { name: /Nuevo Cliente/i })).toBeInTheDocument();
    expect(screen.queryByText("1 de 1 clientes")).not.toBeInTheDocument();
  });

  it("los Administrar del módulo conservan los flujos de catálogo", async () => {
    renderGeneralEntities();

    const module = screen.getByTestId("entity-catalog-project-module");
    expect(
      await within(module).findByRole("heading", { name: "Responsables" })
    ).toBeInTheDocument();

    const responsablesSection = within(module)
      .getByRole("heading", { name: "Responsables" })
      .closest(".drawer-section") as HTMLElement;
    fireEvent.click(within(responsablesSection).getByRole("button", { name: "Administrar" }));

    expect(await screen.findByTestId("actors-list-responsable")).toHaveTextContent(
      "Agregar responsable create-enabled"
    );
  });

  it("Administrar Campos, Lotes y Cultivos abre listas embebidas de catálogo", async () => {
    renderGeneralEntities();

    const module = screen.getByTestId("entity-catalog-project-module");
    expect(await within(module).findByRole("heading", { name: "Campos" })).toBeInTheDocument();

    const camposSection = within(module)
      .getByRole("heading", { name: "Campos" })
      .closest(".drawer-section") as HTMLElement;
    fireEvent.click(within(camposSection).getByRole("button", { name: "Administrar" }));
    expect(await screen.findByTestId("fields-list")).toHaveTextContent("Agregar catalog-enabled");

    fireEvent.click(within(module).getByRole("button", { name: "Administrar Lotes" }));
    expect(await screen.findByTestId("embedded-lots-list")).toHaveTextContent(
      "Agregar catalog-enabled"
    );

    fireEvent.click(within(module).getByRole("button", { name: "Administrar Cultivos" }));
    expect(await screen.findByTestId("crops-list")).toHaveTextContent("catalog-enabled");
  });

  it("nuevo proyecto abre el editor básico de proyecto", () => {
    renderGeneralEntities();

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));

    fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/i }));

    expect(screen.getByTestId("project-basic-drawer")).toHaveTextContent(
      "Project basic drawer create new"
    );
    expect(screen.queryByTestId("customer-editor")).not.toBeInTheDocument();
  });

  it("nuevo lote abre el editor básico de lotes", async () => {
    renderGeneralEntities();

    for (const label of [
      "Cliente",
      "Proyecto",
      "Inversor",
      "Campaña",
      "Proveedores",
      "Responsable",
      "Arrendatario",
    ]) {
      fireEvent.focus(screen.getByLabelText(label));
      fireEvent.click(screen.getByText("Todos"));
    }

    fireEvent.focus(screen.getByLabelText("Campo"));
    fireEvent.click(await screen.findByText("Campo Norte"));

    fireEvent.click(screen.getByRole("button", { name: /Nuevo Lote/i }));

    expect(screen.getByTestId("lot-basic-drawer")).toHaveTextContent("Lot basic drawer create 30");
    expect(screen.queryByTestId("customer-editor")).not.toBeInTheDocument();
  });

  it("nuevo cliente crea actor y customer legacy vinculado", async () => {
    renderGeneralEntities();

    fireEvent.click(screen.getByRole("button", { name: /Nuevo Cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar actor mock" }));

    await waitFor(() => {
      expect(hookState.actors.createActor).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "Cliente Editado",
          roles: ["cliente"],
        })
      );
      expect(hookState.customers.createCustomer).toHaveBeenCalledWith({
        name: "Cliente Editado",
        actor_id: 99,
      });
    });
  });
});
