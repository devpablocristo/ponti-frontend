import { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Manager } from "../../../../hooks/useManagers";

/**
 * Helpers + types puros del ManagersList. Mismo patrón que
 * investorsListHelpers: matcheo de un Manager con los Projects donde
 * aparece (en `detail.managers` o en el string libre `project.managers`).
 */

export type ManagerProjectRelation = {
  customer: string;
  project: string;
  campaign: string;
  fields: string[];
};

export type ManagerRow = Manager & {
  project_count: number;
  related_customers: string;
  related_projects: string;
  related_campaigns: string;
  related_fields: string;
};

export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function uniqueJoined(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).join(", ");
}

export function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function getProjectFieldNames(project: ProjectData, detail?: Project) {
  const fields = detail?.fields ?? project.fields ?? [];
  return fields.map((field) => field.name).filter(Boolean);
}

export function managerBelongsToProject(
  manager: Manager,
  project: ProjectData,
  detail?: Project,
) {
  const normalizedManagerName = normalizeName(manager.name);
  const detailManagers = detail?.managers ?? [];

  if (
    detailManagers.some(
      (entry) =>
        (entry.id !== null && entry.id !== 0 && entry.id === manager.id) ||
        normalizeName(entry.name) === normalizedManagerName,
    )
  ) {
    return true;
  }

  return (project.managers || "")
    .split(/[,;]+/)
    .map((entry) => normalizeName(entry))
    .filter(Boolean)
    .some(
      (entry) =>
        entry === normalizedManagerName ||
        entry.includes(normalizedManagerName) ||
        normalizedManagerName.includes(entry),
    );
}

export function findManagerRelations(
  manager: Manager,
  projects: ProjectData[],
  details: Record<number, Project>,
) {
  return projects.reduce<ManagerProjectRelation[]>((relations, project) => {
    const detail = details[project.id];
    if (!managerBelongsToProject(manager, project, detail)) return relations;

    relations.push({
      customer: detail?.customer.name || project.customer,
      project: project.name,
      campaign: detail?.campaign.name || project.campaign,
      fields: getProjectFieldNames(project, detail),
    });
    return relations;
  }, []);
}

export function buildManagerRows(
  managers: Manager[],
  projects: ProjectData[],
  details: Record<number, Project>,
): ManagerRow[] {
  return managers.map((manager) => {
    const relations = findManagerRelations(manager, projects, details);

    return {
      ...manager,
      project_count: relations.length,
      related_customers: uniqueJoined(relations.map((relation) => relation.customer)),
      related_projects: uniqueJoined(relations.map((relation) => relation.project)),
      related_campaigns: uniqueJoined(relations.map((relation) => relation.campaign)),
      related_fields: uniqueJoined(relations.flatMap((relation) => relation.fields)),
    };
  });
}
