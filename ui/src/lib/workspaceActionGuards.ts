export type WorkspaceRequirement = "customer" | "project" | "campaign" | "field";

export type WorkspaceActionSelection = {
  customerId?: number | null;
  projectId?: number | null;
  campaignId?: number | string | null;
  fieldId?: number | null;
};

type WorkspaceActionWarningInput = {
  action: string;
  entity: string;
  missing: WorkspaceRequirement;
};

const requirementLabel: Record<WorkspaceRequirement, string> = {
  customer: "un cliente",
  project: "un proyecto",
  campaign: "una campaña",
  field: "un campo específico",
};

export function getMissingWorkspaceRequirement(
  selection: WorkspaceActionSelection,
  requirements: WorkspaceRequirement[],
) {
  if (requirements.includes("customer") && !selection.customerId) return "customer";
  if (requirements.includes("project") && !selection.projectId) return "project";
  if (requirements.includes("campaign") && !selection.campaignId) return "campaign";
  if (requirements.includes("field") && !selection.fieldId) return "field";
  return null;
}

export function getWorkspaceActionWarning({
  action,
  entity,
  missing,
}: WorkspaceActionWarningInput) {
  return `Para ${action} ${entity}, seleccioná ${requirementLabel[missing]}.`;
}

export function getGuardedWorkspaceActionWarning(
  selection: WorkspaceActionSelection,
  requirements: WorkspaceRequirement[],
  action: string,
  entity: string,
) {
  const missing = getMissingWorkspaceRequirement(selection, requirements);
  return missing ? getWorkspaceActionWarning({ action, entity, missing }) : null;
}
