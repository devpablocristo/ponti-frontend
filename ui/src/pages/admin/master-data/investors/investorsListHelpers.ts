import { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Investor } from "../../../../hooks/useInvestors";

/**
 * Helpers + types puros del InvestorsList. La lógica clave es matchear un
 * Investor con los Projects donde aparece (puede estar en `detail` o en el
 * texto libre `project.investors` que tiene formato "Juan Perez - 25%").
 * Las funciones son puras: solo data in/out, sin React/notify/fetch.
 */

export type InvestorProjectRelation = {
  customer: string;
  project: string;
  campaign: string;
  fields: string[];
  percentage: string;
};

export type InvestorRow = Investor & {
  project_count: number;
  related_customers: string;
  related_projects: string;
  related_campaigns: string;
  related_percentages: string;
};

export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseProjectInvestors(raw: string) {
  return raw
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const percentageMatch = entry.match(/(\d+(?:[.,]\d+)?)\s*%/);
      const name = entry
        .replace(/\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .replace(/\s+\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .trim();
      return {
        name,
        normalizedName: normalizeName(name),
        percentage: percentageMatch ? `${percentageMatch[1].replace(",", ".")}%` : "",
      };
    });
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

export function getProjectInvestorMatches(
  investor: Investor,
  project: ProjectData,
  detail?: Project,
) {
  const normalizedInvestorName = normalizeName(investor.name);
  const matches: string[] = [];

  if (detail) {
    const detailInvestors = [
      ...(detail.investors ?? []),
      ...(detail.admin_cost_investors ?? []),
      ...(detail.fields ?? []).flatMap((field) => field.investors ?? []),
    ];

    detailInvestors.forEach((entry) => {
      const isSameInvestor =
        (entry.id !== null && entry.id !== 0 && entry.id === investor.id) ||
        normalizeName(entry.name) === normalizedInvestorName;

      if (isSameInvestor && Number(entry.percentage) > 0) {
        matches.push(`${entry.percentage}%`);
      }
    });
  }

  parseProjectInvestors(project.investors || "").forEach((entry) => {
    const isSameInvestor =
      entry.normalizedName === normalizedInvestorName ||
      entry.normalizedName.includes(normalizedInvestorName) ||
      normalizedInvestorName.includes(entry.normalizedName);

    if (isSameInvestor && entry.percentage) {
      matches.push(entry.percentage);
    }
  });

  return Array.from(new Set(matches));
}

export function findInvestorRelations(
  investor: Investor,
  projects: ProjectData[],
  details: Record<number, Project>,
) {
  const normalizedInvestorName = normalizeName(investor.name);

  return projects.reduce<InvestorProjectRelation[]>((relations, project) => {
    const detail = details[project.id];
    const matches = getProjectInvestorMatches(investor, project, detail);

    if (matches.length === 0) {
      const projectInvestors = parseProjectInvestors(project.investors || "");
      const match = projectInvestors.find((entry) => {
        if (!entry.normalizedName) return false;
        return (
          entry.normalizedName === normalizedInvestorName ||
          entry.normalizedName.includes(normalizedInvestorName) ||
          normalizedInvestorName.includes(entry.normalizedName)
        );
      });

      if (!match) return relations;
      matches.push(match.percentage);
    }

    relations.push({
      customer: detail?.customer.name || project.customer,
      project: project.name,
      campaign: detail?.campaign.name || project.campaign,
      fields: getProjectFieldNames(project, detail),
      percentage: matches.filter(Boolean).join(", "),
    });
    return relations;
  }, []);
}

export function buildInvestorRows(
  investors: Investor[],
  projects: ProjectData[],
  details: Record<number, Project>,
): InvestorRow[] {
  return investors.map((investor) => {
    const relations = findInvestorRelations(investor, projects, details);

    return {
      ...investor,
      project_count: relations.length,
      related_customers: uniqueJoined(relations.map((relation) => relation.customer)),
      related_projects: uniqueJoined(relations.map((relation) => relation.project)),
      related_campaigns: uniqueJoined(relations.map((relation) => relation.campaign)),
      related_percentages: uniqueJoined(
        relations.map((relation) =>
          relation.percentage ? `${relation.project}: ${relation.percentage}` : "",
        ),
      ),
    };
  });
}
