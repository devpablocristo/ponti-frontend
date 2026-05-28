import { describe, expect, it } from "vitest";

import type { Actor } from "../../../../hooks/useActors";
import type { Campaign } from "../../../../hooks/useCampaigns";
import type { Crop } from "../../../../hooks/useCrops";
import type { CustomerData } from "../../../../hooks/useCustomers/types";
import type { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import type { Data as Field } from "../../../../hooks/useFields/types";
import type { LotsData } from "../../../../hooks/useLots/types";
import type { Data as Provider } from "../../../../hooks/useProviders/types";
import type { SupplyMovement } from "../../../../hooks/useSupplyMovements/types";
import {
  buildCascadingGeneralEntityFilterValues,
  buildGeneralEntityRows,
  generalEntityValueMatches,
} from "./generalEntityRows";

const lot = (overrides: Partial<LotsData>): LotsData => ({
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
  ...overrides,
});

const fixtures = () => {
  const customers: CustomerData[] = [
    { id: 1, actor_id: 101, name: "Cliente Uno" },
  ];
  const projects: ProjectData[] = [
    {
      id: 10,
      name: "Proyecto A",
      customer: "Cliente Uno",
      campaign: "2025-2026",
      managers: "Responsable Uno",
      investors: "Inversor Uno - 60%",
      fields: [{ name: "Campo Norte", lease_type: "", hectares: "10", crops: "Soja" }],
    },
  ];
  const detail: Project = {
    name: "Proyecto A",
    customer: { id: 1, actor_id: 101, name: "Cliente Uno" },
    campaign: { id: 20, name: "2025-2026" },
    managers: [{ id: 301, actor_id: 102, name: "Responsable Uno" }],
    investors: [{ id: 401, actor_id: 103, name: "Inversor Uno", percentage: 60 }],
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
        investors: [{ id: 501, actor_id: 106, name: "Arrendatario Uno", percentage: 100 }],
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
          {
            id: 41,
            name: "Lote 15",
            hectares: 12,
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
  const actors: Actor[] = [
    { id: 101, actor_kind: "organization", display_name: "Cliente Uno", roles: ["cliente"] },
    { id: 102, actor_kind: "natural_person", display_name: "Responsable Uno", roles: ["responsable"] },
    { id: 103, actor_kind: "organization", display_name: "Inversor Uno", roles: ["inversor"] },
    { id: 105, actor_kind: "organization", display_name: "Proveedor Uno", roles: ["proveedor"] },
    { id: 106, actor_kind: "organization", display_name: "Arrendatario Uno", roles: [] },
  ];
  const campaigns: Campaign[] = [{ id: 20, name: "2025-2026", project_id: 10 }];
  const fields: Field[] = [{ id: 30, name: "Campo Norte", project_id: 10 }];
  const lots = [
    lot({ id: 40, lot_name: "Lote 1" }),
    lot({ id: 41, lot_name: "Lote 15" }),
  ];
  const crops: Crop[] = [
    { id: 60, name: "Maiz" },
    { id: 61, name: "Soja" },
  ];
  const providers: Provider[] = [{ id: 80, name: "Proveedor Uno" }];
  const supplyMovements: SupplyMovement[] = [
    {
      id: 1,
      project_id: 10,
      entry_type: "purchase",
      reference_number: "A",
      entry_date: "2026-01-01",
      investor_name: "Inversor Uno",
      supply_name: "Semilla",
      quantity: "1",
      category: "Semillas",
      type: "Insumo",
      provider_name: "Proveedor Uno",
      price_usd: 1,
      total_usd: 1,
    },
  ];

  return {
    actors,
    campaigns,
    crops,
    customers,
    fields,
    lots,
    projectDetails: { 10: detail },
    projects,
    providers,
    supplyMovements,
  };
};

describe("generalEntityRows", () => {
  it("genera filas para cada tipo de entidad", () => {
    const rows = buildGeneralEntityRows(fixtures());
    expect(new Set(rows.map((row) => row.entityKind))).toEqual(
      new Set(["customer", "project", "actor", "campaign", "field", "lot", "crop"]),
    );
  });

  it("no duplica inversores, proveedores ni responsables por contexto repetido", () => {
    const rows = buildGeneralEntityRows(fixtures());
    const actorNames = (role: string) =>
      rows
        .filter((row) => row.entityKind === "actor" && row.roles.includes(role as never))
        .map((row) => row.name);

    expect(actorNames("inversor").filter((name) => name === "Inversor Uno")).toHaveLength(1);
    expect(actorNames("proveedor").filter((name) => name === "Proveedor Uno")).toHaveLength(1);
    expect(actorNames("responsable").filter((name) => name === "Responsable Uno")).toHaveLength(1);
  });

  it("filtra proveedores por lo anterior sin tamizar lo posterior", () => {
    const rows = buildGeneralEntityRows(fixtures());
    const values = buildCascadingGeneralEntityFilterValues(rows, {
      customer: "Cliente Uno",
      project: "Proyecto A",
      investor: "Inversor Uno",
      campaign: "2025-2026",
      provider: "Proveedor Uno",
    });

    expect(values.provider).toContain("Proveedor Uno");
    expect(values.tenant).toContain("Arrendatario Uno");
    expect(values.field).toContain("Campo Norte");
  });

  it("responsable no depende de lote ni cultivo", () => {
    const rows = buildGeneralEntityRows(fixtures());
    const values = buildCascadingGeneralEntityFilterValues(rows, {
      customer: "Cliente Uno",
      project: "Proyecto A",
      campaign: "2025-2026",
      field: "Campo Norte",
      lot: "Lote 1",
      crop: "Soja",
    });

    expect(values.manager).toContain("Responsable Uno");
  });

  it("arrendatario aparece si está usado en campo aunque venga como actor contextual", () => {
    const rows = buildGeneralEntityRows(fixtures());
    const tenant = rows.find((row) => row.name === "Arrendatario Uno");

    expect(tenant?.roles).toContain("arrendatario");
    expect(tenant?.filterValues.field).toContain("Campo Norte");
  });

  it("trata proveedores y arrendatarios como roles de actor", () => {
    const rows = buildGeneralEntityRows(fixtures());

    expect(rows.find((row) => row.name === "Proveedor Uno")?.roles).toContain("proveedor");
    expect(rows.find((row) => row.name === "Arrendatario Uno")?.roles).toContain("arrendatario");
  });

  it("no matchea Lote 1 con Lote 15", () => {
    expect(generalEntityValueMatches("Lote 1", "Lote 1")).toBe(true);
    expect(generalEntityValueMatches("Lote 15", "Lote 1")).toBe(false);
    expect(generalEntityValueMatches("Lote 15b", "Lote 1")).toBe(false);
  });
});
