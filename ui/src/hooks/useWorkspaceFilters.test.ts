import { describe, expect, it } from "vitest";

import {
  formatWorkspaceFilterName,
  withWorkspaceFilterDisplayName,
} from "./useWorkspaceFilters";

describe("workspace filter display helpers", () => {
  it("formats proper-name filter values without changing the stored option name", () => {
    const options = withWorkspaceFilterDisplayName([
      { id: 1, name: "el sueño" },
      { id: 2, name: "soalen srl" },
    ]);

    expect(options).toEqual([
      { id: 1, name: "el sueño", displayName: "El Sueño" },
      { id: 2, name: "soalen srl", displayName: "Soalen SRL" },
    ]);
  });

  it("formats the selected value shown in the filter input", () => {
    expect(formatWorkspaceFilterName("campo coty")).toBe("Campo Coty");
  });
});
