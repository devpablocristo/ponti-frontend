import { describe, expect, it } from "vitest";

import { buildWorkspaceQuery, withQuery } from "./workspaceQuery";

describe("workspaceQuery", () => {
  it("omits empty workspace filters so Todos means global scope", () => {
    expect(
      buildWorkspaceQuery({
        customerId: undefined,
        projectId: null,
        campaignId: 0,
        fieldId: "",
      })
    ).toBe("");
  });

  it("serializes selected workspace filters and extras", () => {
    expect(
      buildWorkspaceQuery({
        customerId: 17,
        projectId: 30,
        campaignId: 2,
        fieldId: 39,
        extra: { supply_id: 550, page: 1, per_page: 10 },
      })
    ).toBe("customer_id=17&project_id=30&campaign_id=2&field_id=39&supply_id=550&page=1&per_page=10");
  });

  it("appends query strings only when needed", () => {
    expect(withQuery("/lots", "")).toBe("/lots");
    expect(withQuery("/lots", "project_id=30")).toBe("/lots?project_id=30");
  });
});
