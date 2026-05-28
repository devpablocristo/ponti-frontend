import { describe, expect, it } from "vitest";

import type { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import type { Investor } from "../../../../hooks/useInvestors";
import type { Manager } from "../../../../hooks/useManagers";
import {
  actorMatchesResponsibleContext,
  buildInvestorContextMatch,
  buildResponsibleContextMatch,
  hasActorContextFilters,
  projectMatchesActorContext,
} from "./actorContextFilters";

const project = (overrides: Partial<ProjectData> = {}): ProjectData => ({
  id: 10,
  name: "Jujuy Mealla Acheral",
  customer: "Agro Lajitas 25 26",
  campaign: "2025-2026",
  managers: "Gero",
  investors: "",
  fields: [],
  ...overrides,
});

const detail = (overrides: Partial<Project> = {}): Project => ({
  name: "Jujuy Mealla Acheral",
  customer: { id: 7, actor_id: 70, name: "Agro Lajitas 25 26" },
  campaign: { id: 5, name: "2025-2026" },
  managers: [{ id: 3, actor_id: 101, name: "Gero" }],
  investors: [],
  admin_cost_investors: [],
  admin_cost: 0,
  planned_cost: 0,
  fields: [],
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("actorContextFilters", () => {
  it("detecta contexto heredado por ids o nombres", () => {
    expect(hasActorContextFilters({})).toBe(false);
    expect(hasActorContextFilters({ customerName: "Agro Lajitas" })).toBe(true);
    expect(hasActorContextFilters({ projectId: 10 })).toBe(true);
  });

  it("matchea proyectos por cliente, proyecto y campaña", () => {
    expect(
      projectMatchesActorContext(project(), detail(), {
        customerId: 7,
        projectId: 10,
        campaignName: "2025-2026",
      }),
    ).toBe(true);

    expect(
      projectMatchesActorContext(project(), detail(), {
        customerName: "Otro Cliente",
        projectId: 10,
      }),
    ).toBe(false);
  });

  it("arma match de responsables relacionados al contexto", () => {
    const managers: Manager[] = [
      { id: 3, actor_id: 101, name: "Gero" },
      { id: 4, actor_id: 102, name: "Nico" },
    ];
    const match = buildResponsibleContextMatch(
      managers,
      [project()],
      { 10: detail() },
      { customerId: 7, projectId: 10, campaignId: 5 },
    );

    expect(actorMatchesResponsibleContext({ id: 101, display_name: "Gero" }, match)).toBe(true);
    expect(actorMatchesResponsibleContext({ id: 102, display_name: "Nico" }, match)).toBe(false);
  });

  it("arma match de inversores relacionados al contexto", () => {
    const investors: Investor[] = [
      { id: 8, actor_id: 201, name: "Olega SA" },
      { id: 9, actor_id: 202, name: "Otro Inversor" },
    ];
    const match = buildInvestorContextMatch(
      investors,
      [project({ investors: "Olega SA - 40%" })],
      {
        10: detail({
          investors: [{ id: 8, actor_id: 201, name: "Olega SA", percentage: 40 }],
        }),
      },
      { customerId: 7, projectId: 10, campaignId: 5 },
    );

    expect(actorMatchesResponsibleContext({ id: 201, display_name: "Olega SA" }, match)).toBe(
      true,
    );
    expect(
      actorMatchesResponsibleContext({ id: 202, display_name: "Otro Inversor" }, match),
    ).toBe(false);
  });
});
