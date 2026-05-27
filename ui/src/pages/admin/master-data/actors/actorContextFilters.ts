import type { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import type { Manager } from "../../../../hooks/useManagers";
import type { Investor } from "../../../../hooks/useInvestors";
import type { Actor } from "../../../../hooks/useActors";
import { buildManagerRows, normalizeName } from "../managers/managersListHelpers";
import { buildInvestorRows } from "../investors/investorsListHelpers";

export type ActorContextFilters = {
  customerId?: number | null;
  customerName?: string;
  projectId?: number | null;
  projectName?: string;
  campaignId?: number | null;
  campaignName?: string;
  fieldId?: number | null;
  fieldName?: string;
};

export type ActorRoleContextMatch = {
  actorIds: Set<number>;
  names: Set<string>;
};

const hasPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const sameName = (left?: string, right?: string) =>
  hasText(left) && hasText(right) && normalizeName(left) === normalizeName(right);

export function hasActorContextFilters(context?: ActorContextFilters | null) {
  return Boolean(
    context &&
      (hasPositiveId(context.customerId) ||
        hasText(context.customerName) ||
        hasPositiveId(context.projectId) ||
        hasText(context.projectName) ||
        hasPositiveId(context.campaignId) ||
        hasText(context.campaignName) ||
        hasPositiveId(context.fieldId) ||
        hasText(context.fieldName)),
  );
}

export function projectMatchesActorContext(
  project: ProjectData,
  detail: Project | undefined,
  context: ActorContextFilters,
) {
  if (hasPositiveId(context.projectId) && project.id !== context.projectId) return false;
  if (!hasPositiveId(context.projectId) && hasText(context.projectName) && !sameName(project.name, context.projectName)) {
    return false;
  }

  if (hasPositiveId(context.customerId) && hasPositiveId(detail?.customer.id)) {
    if (detail?.customer.id !== context.customerId) return false;
  } else if (hasText(context.customerName)) {
    const customerName = detail?.customer.name || project.customer;
    if (!sameName(customerName, context.customerName)) return false;
  }

  if (hasPositiveId(context.campaignId) && hasPositiveId(detail?.campaign.id)) {
    if (detail?.campaign.id !== context.campaignId) return false;
  } else if (hasText(context.campaignName)) {
    const campaignName = detail?.campaign.name || project.campaign;
    if (!sameName(campaignName, context.campaignName)) return false;
  }

  return true;
}

export function buildResponsibleContextMatch(
  managers: Manager[],
  projects: ProjectData[],
  details: Record<number, Project>,
  context: ActorContextFilters,
): ActorRoleContextMatch {
  const contextProjects = projects.filter((project) =>
    projectMatchesActorContext(project, details[project.id], context),
  );
  const managerRows = buildManagerRows(managers, contextProjects, details).filter(
    (row) => row.project_count > 0,
  );

  return {
    actorIds: new Set(
      managerRows
        .map((manager) => manager.actor_id)
        .filter((actorId): actorId is number => hasPositiveId(actorId)),
    ),
    names: new Set(managerRows.map((manager) => normalizeName(manager.name))),
  };
}

export function buildInvestorContextMatch(
  investors: Investor[],
  projects: ProjectData[],
  details: Record<number, Project>,
  context: ActorContextFilters,
): ActorRoleContextMatch {
  const contextProjects = projects.filter((project) =>
    projectMatchesActorContext(project, details[project.id], context),
  );
  const investorRows = buildInvestorRows(investors, contextProjects, details).filter(
    (row) => row.project_count > 0,
  );

  return {
    actorIds: new Set(
      investorRows
        .map((investor) => investor.actor_id)
        .filter((actorId): actorId is number => hasPositiveId(actorId)),
    ),
    names: new Set(investorRows.map((investor) => normalizeName(investor.name))),
  };
}

export function actorMatchesResponsibleContext(
  actor: Pick<Actor, "id" | "display_name">,
  contextMatch: ActorRoleContextMatch,
) {
  if (contextMatch.actorIds.has(actor.id)) return true;
  return contextMatch.names.has(normalizeName(actor.display_name));
}
