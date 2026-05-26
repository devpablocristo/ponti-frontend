import { describe, expect, it } from "vitest";

import {
  getGuardedWorkspaceActionWarning,
  getMissingWorkspaceRequirement,
} from "./workspaceActionGuards";

describe("workspaceActionGuards", () => {
  it("detecta el primer filtro requerido faltante", () => {
    expect(
      getMissingWorkspaceRequirement(
        { customerId: 1, projectId: 2, campaignId: 3, fieldId: null },
        ["customer", "project", "campaign", "field"],
      ),
    ).toBe("field");
  });

  it("devuelve warning estándar para campo específico", () => {
    expect(
      getGuardedWorkspaceActionWarning(
        { customerId: 1, projectId: 2, campaignId: 3 },
        ["field"],
        "crear",
        "un lote",
      ),
    ).toBe("Para crear un lote, seleccioná un campo específico.");
  });

  it("no devuelve warning cuando están todas las precondiciones", () => {
    expect(
      getGuardedWorkspaceActionWarning(
        { customerId: 1, projectId: 2, campaignId: 3, fieldId: 4 },
        ["customer", "project", "campaign", "field"],
        "crear",
        "un lote",
      ),
    ).toBeNull();
  });
});
