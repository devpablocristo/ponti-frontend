import { describe, expect, it } from "vitest";

import { fuzzySearchOptions } from "../../../lib/fuzzySearch";
import type { Project } from "../../../hooks/useDatabase/projects/types";
import {
  buildProjectEditorScope,
  collectScopedCropOptions,
  filterProjectEditorOptions,
  filterScopedFieldOptions,
  filterScopedLotOptions,
  type ProjectEditorScope,
} from "./projectEditorScope";

const concreteScope: ProjectEditorScope = {
  customerId: 1,
  projectId: 10,
  campaignId: 20,
  projectName: "Proyecto A",
  hasConcreteScope: true,
};

const scopedProject: Project = {
  name: "Proyecto A",
  customer: { id: 1, actor_id: 101, name: "Cliente Uno" },
  campaign: { id: 20, name: "2025-2026" },
  managers: [{ id: 201, actor_id: 301, name: "Gero" }],
  investors: [{ id: 202, actor_id: 302, name: "Olega SA", percentage: 100 }],
  admin_cost_investors: [{ id: 203, actor_id: 303, name: "E Vedoya", percentage: 100 }],
  admin_cost: 0,
  planned_cost: 0,
  fields: [
    {
      id: 50,
      name: "Campo Norte",
      lease_type_id: 1,
      lease_type_percent: null,
      lease_type_value: null,
      investors: [{ id: 204, actor_id: 304, name: "Arrendatario Uno", percentage: 100 }],
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

describe("projectEditorScope", () => {
  it("construye scope concreto por cliente + campaña cuando no hay projectId", () => {
    const scope = buildProjectEditorScope({
      selectionOnlyRelations: true,
      selectedCustomerId: 1,
      selectedProjectId: "new",
      initialCampaign: { id: 20, name: "2025-2026" },
    });

    expect(scope).toMatchObject({
      customerId: 1,
      projectId: null,
      campaignId: 20,
      hasConcreteScope: true,
    });
  });

  it("no devuelve opciones de responsables fuera del contexto", () => {
    const options = [
      { id: 301, name: "Gero", roles: ["responsable"] },
      { id: 399, name: "Responsable Fuera", roles: ["responsable"] },
      { id: 302, name: "Olega SA", roles: ["inversor"] },
    ];

    const result = filterProjectEditorOptions(
      options,
      concreteScope,
      scopedProject.managers,
      "responsable"
    );

    expect(result.map((option) => option.name)).toEqual(["Gero"]);
  });

  it("no devuelve inversores fuera del contexto ni de otro rol", () => {
    const options = [
      { id: 302, name: "Olega SA", roles: ["inversor"] },
      { id: 399, name: "Inversor Fuera", roles: ["inversor"] },
      { id: 301, name: "Gero", roles: ["responsable"] },
    ];

    const result = filterProjectEditorOptions(
      options,
      concreteScope,
      scopedProject.investors,
      "inversor"
    );

    expect(result.map((option) => option.name)).toEqual(["Olega SA"]);
  });

  it("acota campos, lotes y cultivos al proyecto cargado", () => {
    const fields = filterScopedFieldOptions(
      [
        { id: 50, name: "Campo Norte", project_id: 10 },
        { id: 51, name: "Campo Fuera", project_id: 99 },
      ],
      concreteScope,
      scopedProject.fields
    );
    const lots = filterScopedLotOptions(
      [
        { id: 60, name: "Lote 1", field_id: 50 },
        { id: 61, name: "Lote Fuera", field_id: 99 },
      ],
      50
    );
    const crops = collectScopedCropOptions(scopedProject, [
      { id: 80, name: "Maiz" },
      { id: 81, name: "Soja" },
      { id: 90, name: "Trigo" },
    ]);

    expect(fields.map((option) => option.name)).toEqual(["Campo Norte"]);
    expect(lots.map((option) => option.name)).toEqual(["Lote 1"]);
    expect(crops.map((option) => option.name)).toEqual(["Maiz", "Soja"]);
  });

  it("la búsqueda fuzzy encuentra dentro del contexto y no revela opciones fuera", () => {
    const filtered = filterProjectEditorOptions(
      [
        { id: 301, name: "Gero", roles: ["responsable"] },
        { id: 399, name: "German Fuera", roles: ["responsable"] },
      ],
      concreteScope,
      scopedProject.managers,
      "responsable"
    );

    expect(fuzzySearchOptions("ger", filtered).map((option) => option.name)).toEqual(["Gero"]);
    expect(fuzzySearchOptions("fuera", filtered)).toEqual([]);
  });

  it("no hace fallback global cuando falta contexto concreto", () => {
    const result = filterProjectEditorOptions(
      [{ id: 301, name: "Gero", roles: ["responsable"] }],
      {
        customerId: null,
        projectId: null,
        campaignId: null,
        projectName: "",
        hasConcreteScope: false,
      },
      scopedProject.managers,
      "responsable"
    );

    expect(result).toEqual([]);
  });
});
