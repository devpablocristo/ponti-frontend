import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Column } from "../../types";
import GeneralEntities from "./GeneralEntities";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  actors: {
    actors: [] as Array<{ id: number; actor_kind: "organization"; display_name: string; roles: string[] }>,
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

vi.mock("../../../../components/crud/ResponsiveTable", () => ({
  ResponsiveTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Column<Record<string, unknown>>[];
  }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={String(row.id)}>
            {columns.map((column, index) => (
              <td key={`${String(column.key)}-${index}`}>
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

vi.mock("../campaigns/CampaignFormDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="campaign-form-drawer">Campaign drawer</div> : null,
}));

vi.mock("../crops/CropFormDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="crop-form-drawer">Crop drawer</div> : null,
}));

vi.mock("../customers/CustomerEditor", () => ({
  default: () => <div data-testid="customer-editor">Customer editor</div>,
}));

vi.mock("./LotEditDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="lot-edit-drawer">Lot drawer</div> : null,
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
  mockApiClient.get.mockResolvedValue({ success: true, data: projectDetail });
}

describe("GeneralEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it("muestra filtros en orden correcto y filas", async () => {
    render(<GeneralEntities />);

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

    expect(await screen.findByText("Cliente Uno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nuevo Proyecto/i })).toBeInTheDocument();
  });

  it("cambia Nuevo según la primera entidad en Buscar", () => {
    render(<GeneralEntities />);

    expect(screen.getByRole("button", { name: /Nuevo Cliente/i })).toBeInTheDocument();

    for (const label of ["Cliente", "Proyecto", "Inversor", "Campaña"]) {
      fireEvent.focus(screen.getByLabelText(label));
      fireEvent.click(screen.getByText("Todos"));
    }

    expect(screen.getByRole("button", { name: /Nuevo Proveedor/i })).toBeInTheDocument();
  });

  it("seleccionar filtros no abre editor", () => {
    render(<GeneralEntities />);

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));

    expect(screen.queryByTestId("actor-form-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lot-edit-drawer")).not.toBeInTheDocument();
  });

  it("click afuera deja el filtro abierto en Buscar como sin selección", async () => {
    render(<GeneralEntities />);

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

    render(<GeneralEntities />);

    const customerFilter = screen.getByLabelText("Cliente");
    fireEvent.focus(customerFilter);
    fireEvent.click(await screen.findByText("Agro Lajitas SRL"));

    expect(customerFilter).toHaveValue("Agro Lajitas SRL");
    expect(screen.getByText("Agro Lajitas SRL")).toBeInTheDocument();
    expect(screen.queryByText("agro lajitas srl")).not.toBeInTheDocument();
  });

  it("limpia filtros seleccionados cuando la entidad deja de estar activa", async () => {
    const { rerender } = render(<GeneralEntities />);

    const customerFilter = screen.getByLabelText("Cliente");
    fireEvent.focus(customerFilter);
    fireEvent.click(await screen.findByText("Cliente Uno"));

    expect(customerFilter).toHaveValue("Cliente Uno");
    expect(screen.getByRole("button", { name: /Nuevo Proyecto/i })).toBeInTheDocument();

    hookState.customers.customers = [];
    rerender(<GeneralEntities />);

    await waitFor(() => {
      expect(screen.getByLabelText("Cliente")).toHaveValue("");
    });
    expect(screen.getByRole("button", { name: /Nuevo Cliente/i })).toBeInTheDocument();
    expect(screen.queryByText("1 de 1 clientes")).not.toBeInTheDocument();
  });

  it("no carga detalles de proyectos al entrar y los carga por demanda", async () => {
    render(<GeneralEntities />);

    expect(mockApiClient.get).not.toHaveBeenCalled();

    fireEvent.focus(screen.getByLabelText("Lote"));
    fireEvent.click(screen.getByText("Todos"));

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith("/projects/10?fresh=1");
    });
  });

  it("editar lote abre el editor correcto de lotes", async () => {
    render(<GeneralEntities />);

    fireEvent.focus(screen.getByLabelText("Lote"));
    fireEvent.click(screen.getByText("Todos"));

    expect(await screen.findByText("Lote 1")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Seleccionar Lote 1"));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByTestId("lot-edit-drawer")).toBeInTheDocument();
  });

  it("editar cliente sincroniza actor y customer legacy", async () => {
    render(<GeneralEntities />);

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Todos"));

    expect(await screen.findByText("Cliente Uno")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Seleccionar Cliente Uno"));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByTestId("actor-form-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar actor mock" }));

    await waitFor(() => {
      expect(hookState.actors.updateActor).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ display_name: "Cliente Editado" }),
      );
      expect(hookState.customers.updateCustomer).toHaveBeenCalledWith(1, {
        name: "Cliente Editado",
        actor_id: 1,
      });
    });
  });

  it("nuevo cliente crea actor y customer legacy vinculado", async () => {
    render(<GeneralEntities />);

    fireEvent.click(screen.getByRole("button", { name: /Nuevo Cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar actor mock" }));

    await waitFor(() => {
      expect(hookState.actors.createActor).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "Cliente Editado",
          roles: ["cliente"],
        }),
      );
      expect(hookState.customers.createCustomer).toHaveBeenCalledWith({
        name: "Cliente Editado",
        actor_id: 99,
      });
    });
  });
});
