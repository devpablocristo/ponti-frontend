import { apiClient } from "@/api/client";

/**
 * Tipos y helpers puros del CustomersList. Sin React/JSX. Encapsulan
 * cálculos sobre el shape `RawProject` (subset del response del BE) que
 * el listado usa para agrupar customers + counts de campañas/campos +
 * suma de hectáreas con filtros activos.
 */

export type CustomerProjectMode = "customer" | "project";

export type CustomerProjectRow = {
  id: number;
  mode: CustomerProjectMode;
  projectId?: number;
  projectIds: number[];
  customerId: number;
  customerName: string;
  projectName: string;
  campaignLabel?: string;
  groupSize?: number;
  campaignCount: number;
  fieldCount: number;
};

export type RawProject = {
  id?: number;
  name?: string;
  campaign?: { id?: number | null; name?: string | null } | string | null;
  campaign_id?: number | null;
  campaign_name?: string | null;
  fields?:
    | Array<
        | {
            id?: number;
            name?: string;
            lots?: Array<{ hectares?: number | string | null }> | null;
          }
        | string
      >
    | null;
};

export type ProjectSummaryResponse = {
  success: boolean;
  data?: {
    data?: RawProject[];
  };
};

export type ProjectDetailResponse = {
  success: boolean;
  data?: RawProject;
};

export function campaignKey(project: RawProject) {
  if (typeof project.campaign === "string") return project.campaign;
  return (
    project.campaign?.name ||
    project.campaign?.id ||
    project.campaign_name ||
    project.campaign_id ||
    ""
  );
}

export function normalizeFilter(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function campaignName(project: RawProject) {
  const key = campaignKey(project);
  return String(key || "");
}

export function countUniqueCampaigns(projects: RawProject[]) {
  return new Set(projects.map(campaignName).filter(Boolean)).size;
}

export function countUniqueFields(projects: RawProject[]) {
  const fields = new Set<string>();

  projects.forEach((project) => {
    (Array.isArray(project.fields) ? project.fields : []).forEach((field) => {
      if (typeof field === "string") {
        fields.add(normalizeFilter(field));
        return;
      }
      fields.add(String(field.id ?? normalizeFilter(field.name ?? "")));
    });
  });

  return fields.size;
}

export function projectMatchesFilters(
  project: RawProject,
  selectedProject: { id?: number; name?: string } | undefined,
  selectedCampaign: { name?: string } | undefined,
  selectedField: { id?: number; name?: string } | undefined,
) {
  const campaignNeedle = normalizeFilter(selectedCampaign?.name ?? "");
  const fieldNeedle = normalizeFilter(selectedField?.name ?? "");
  const selectedProjectId =
    typeof selectedProject?.id === "number" && selectedProject.id > 0
      ? selectedProject.id
      : undefined;
  const projectId =
    typeof project.id === "number" && project.id > 0 ? project.id : undefined;

  const matchesProject = (() => {
    if (!selectedProject) return true;
    if (selectedProjectId && projectId) return projectId === selectedProjectId;
    return normalizeFilter(project.name ?? "").includes(
      normalizeFilter(selectedProject.name ?? "")
    );
  })();
  const matchesCampaign =
    !selectedCampaign || normalizeFilter(campaignName(project)).includes(campaignNeedle);
  const matchesField =
    !selectedField ||
    (Array.isArray(project.fields) ? project.fields : []).some((field) => {
      if (typeof field === "string") return normalizeFilter(field).includes(fieldNeedle);
      return (
        field.id === selectedField.id ||
        normalizeFilter(field.name ?? "").includes(fieldNeedle)
      );
    });

  return matchesProject && matchesCampaign && matchesField;
}

export function getProjectIdForEdit(
  row: Pick<CustomerProjectRow, "mode" | "projectId" | "projectIds">,
  selectedProject: { id?: number | null } | undefined,
) {
  if (row.projectId && row.projectId > 0) return row.projectId;
  if (selectedProject?.id && selectedProject.id > 0) return selectedProject.id;
  if (row.mode === "project" && row.projectIds.length === 1) return row.projectIds[0];
  return null;
}

export function sumProjectHectares(
  project: RawProject,
  selectedField: { id?: number; name?: string } | undefined,
) {
  return (Array.isArray(project.fields) ? project.fields : []).reduce((total, field) => {
    if (typeof field === "string") return total;
    if (
      selectedField &&
      field.id !== selectedField.id &&
      !normalizeFilter(field.name ?? "").includes(normalizeFilter(selectedField.name ?? ""))
    ) {
      return total;
    }

    const lots = Array.isArray(field.lots) ? field.lots : [];
    return (
      total +
      lots.reduce((subtotal, lot) => {
        const hectares = Number(String(lot.hectares ?? 0).replace(",", "."));
        return subtotal + (Number.isFinite(hectares) ? hectares : 0);
      }, 0)
    );
  }, 0);
}

export async function loadProjectDetails(projects: RawProject[]) {
  return Promise.all(
    projects.map(async (project) => {
      if (!project.id) return project;
      try {
        const response = await apiClient.get<ProjectDetailResponse>(
          `/projects/${project.id}?fresh=1`,
        );
        return response.data ?? project;
      } catch {
        return project;
      }
    }),
  );
}
