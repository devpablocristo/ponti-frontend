import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ArchivedActorsByRole from "./ArchivedActorsByRole";
import type { ActorListFilters } from "./ArchivedActors";

vi.mock("../customers/ArchivedCustomers", () => ({
  default: () => <div>Archived Customers</div>,
}));

vi.mock("../managers/ArchivedManagers", () => ({
  default: () => <div>Archived Managers</div>,
}));

vi.mock("../investors/ArchivedInvestors", () => ({
  default: () => <div>Archived Investors</div>,
}));

vi.mock("./ArchivedActors", () => ({
  default: () => <div>Archived Actors</div>,
}));

const renderForRole = (role: ActorListFilters["role"]) =>
  render(<ArchivedActorsByRole filters={{ role }} onAfterRestore={vi.fn()} />);

describe("ArchivedActorsByRole", () => {
  it("renderiza clientes archivados para rol cliente", () => {
    renderForRole("cliente");

    expect(screen.getByText("Archived Customers")).toBeInTheDocument();
  });

  it("renderiza responsables archivados para rol responsable", () => {
    renderForRole("responsable");

    expect(screen.getByText("Archived Managers")).toBeInTheDocument();
  });

  it("renderiza inversores archivados para rol inversor", () => {
    renderForRole("inversor");

    expect(screen.getByText("Archived Investors")).toBeInTheDocument();
  });

  it("mantiene actores archivados para todos o roles sin CRUDAR dedicado", () => {
    renderForRole("");

    expect(screen.getByText("Archived Actors")).toBeInTheDocument();
  });
});
