import { describe, expect, it } from "vitest";

import {
  customerMatchesFilter,
  getProjectIdForEdit,
  projectMatchesFilters,
  type RawProject,
  uniqueProjectOptionsByName,
  uniqueProjectRowsByName,
} from "./customersListHelpers";

describe("customersListHelpers", () => {
  it("mantiene un cliente filtrado por id aunque cambie su nombre", () => {
    expect(
      customerMatchesFilter({ id: 17, name: "agrolajias" }, { id: 17, name: "agro lajitas 25 28" })
    ).toBe(true);
  });

  it("no matchea otro cliente aunque conserve el nombre anterior", () => {
    expect(
      customerMatchesFilter(
        { id: 18, name: "agro lajitas 25 28" },
        { id: 17, name: "agro lajitas 25 28" }
      )
    ).toBe(false);
  });

  it("mantiene un proyecto filtrado por id aunque cambie su nombre", () => {
    const renamedProject: RawProject = {
      id: 34,
      name: "CAMPO COTY RENOMBRADO",
      campaign: { id: 3, name: "2025-2026" },
      fields: [{ id: 10, name: "COTY" }],
    };

    expect(
      projectMatchesFilters(
        renamedProject,
        { id: 34, name: "CAMPO COTY" },
        { name: "2025-2026" },
        { id: 10, name: "COTY" }
      )
    ).toBe(true);
  });

  it("no matchea otro proyecto aunque conserve el nombre anterior", () => {
    const otherProject: RawProject = {
      id: 99,
      name: "CAMPO COTY",
      campaign: { id: 3, name: "2025-2026" },
      fields: [{ id: 10, name: "COTY" }],
    };

    expect(
      projectMatchesFilters(
        otherProject,
        { id: 34, name: "CAMPO COTY" },
        { name: "2025-2026" },
        { id: 10, name: "COTY" }
      )
    ).toBe(false);
  });

  it("abre editor de proyecto cuando la fila trae projectId", () => {
    expect(
      getProjectIdForEdit({ mode: "project", projectId: 34, projectIds: [34] }, undefined)
    ).toBe(34);
  });

  it("usa el proyecto seleccionado si la fila visible quedo como cliente", () => {
    expect(getProjectIdForEdit({ mode: "customer", projectIds: [34] }, { id: 34 })).toBe(34);
  });

  it("deduplica opciones de proyecto por nombre normalizado", () => {
    expect(
      uniqueProjectOptionsByName([
        { id: 1, name: "Metán Norte" },
        { id: 2, name: "metan norte" },
        { id: 3, name: "Jujuy" },
      ])
    ).toEqual([
      { id: 1, name: "Metán Norte" },
      { id: 3, name: "Jujuy" },
    ]);
  });

  it("deduplica filas de proyecto por nombre dentro de la lista filtrada", () => {
    expect(
      uniqueProjectRowsByName([
        {
          id: 1,
          mode: "project",
          projectId: 1,
          projectIds: [1],
          customerId: 10,
          customerName: "Cliente",
          projectName: "Metán Norte",
          campaignCount: 1,
          fieldCount: 1,
        },
        {
          id: 2,
          mode: "project",
          projectId: 2,
          projectIds: [2],
          customerId: 10,
          customerName: "Cliente",
          projectName: "metan norte",
          campaignCount: 1,
          fieldCount: 1,
        },
      ])
    ).toHaveLength(1);
  });
});
