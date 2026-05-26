import { describe, expect, it } from "vitest";

import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { applyCustomerNameEdit } from "./helpers";

function projectWithCustomer(): Project {
  return {
    name: "qwerty",
    customer: { id: 17, actor_id: 201, name: "AGRO LAJITAS 25-26" },
    campaign: { id: 2, name: "2025-2026" },
    managers: [],
    investors: [],
    admin_cost_investors: [],
    admin_cost: 0,
    planned_cost: 0,
    fields: [],
    updated_at: "2026-05-26T12:00:00Z",
  };
}

describe("CustomerEditor helpers", () => {
  it("updates the customer name without clearing the existing customer identity", () => {
    const updated = applyCustomerNameEdit(projectWithCustomer(), "Agro  Lajitas");

    expect(updated?.customer).toEqual({
      id: 17,
      actor_id: 201,
      name: "Agro Lajitas",
    });
  });

  it("keeps brand-new customer slots without an id", () => {
    const draft = projectWithCustomer();
    draft.customer = { id: null, actor_id: null, name: "" };

    const updated = applyCustomerNameEdit(draft, "Cliente Nuevo");

    expect(updated?.customer).toEqual({
      id: null,
      actor_id: null,
      name: "Cliente Nuevo",
    });
  });
});
