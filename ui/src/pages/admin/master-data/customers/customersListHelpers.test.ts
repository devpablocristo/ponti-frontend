import { describe, expect, it } from "vitest";

import {
  getProjectIdForEdit,
  projectMatchesFilters,
  type RawProject,
} from "./customersListHelpers";

describe("customersListHelpers", () => {
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
      getProjectIdForEdit(
        { mode: "project", projectId: 34, projectIds: [34] },
        undefined
      )
    ).toBe(34);
  });

  it("usa el proyecto seleccionado si la fila visible quedo como cliente", () => {
    expect(
      getProjectIdForEdit(
        { mode: "customer", projectIds: [34] },
        { id: 34 }
      )
    ).toBe(34);
  });
});
