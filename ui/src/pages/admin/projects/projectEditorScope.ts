import type { Project } from "../../../hooks/useDatabase/projects/types";
import { normalizeEntityName } from "../../../lib/entityNameMatcher";
import type { ActorOption, EntityOption, SelectionValue } from "../master-data/customers/types";

type ExistingEntityReference = {
  id?: number | string | null;
  actor_id?: number | null;
  name?: string | null;
};

export type ProjectEditorScope = {
  customerId: number | null;
  projectId: number | null;
  campaignId: number | null;
  projectName: string;
  hasConcreteScope: boolean;
};

type BuildProjectEditorScopeInput = {
  selectionOnlyRelations: boolean;
  selectedCustomerId?: SelectionValue | null;
  selectedProjectId?: SelectionValue | null;
  initialCustomer?: { id?: number | null } | null;
  initialCampaign?: EntityOption | null;
  contextProject?: EntityOption | null;
  projectDraft?: Project | null;
  loadedProjectName?: string;
};

function positiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildProjectEditorScope({
  selectionOnlyRelations,
  selectedCustomerId,
  selectedProjectId,
  initialCustomer,
  initialCampaign,
  contextProject,
  projectDraft,
  loadedProjectName,
}: BuildProjectEditorScopeInput): ProjectEditorScope {
  if (!selectionOnlyRelations) {
    return {
      customerId: null,
      projectId: null,
      campaignId: null,
      projectName: "",
      hasConcreteScope: false,
    };
  }

  const customerId =
    positiveId(projectDraft?.customer.id) ??
    positiveId(initialCustomer?.id) ??
    positiveId(selectedCustomerId);
  const projectId = positiveId(contextProject?.id) ?? positiveId(selectedProjectId);
  const campaignId = positiveId(projectDraft?.campaign.id) ?? positiveId(initialCampaign?.id);
  const projectName =
    contextProject?.name?.trim() ??
    (projectId ? loadedProjectName?.trim() : projectDraft?.name?.trim()) ??
    "";

  return {
    customerId,
    projectId,
    campaignId,
    projectName,
    hasConcreteScope: Boolean(projectId || (customerId && campaignId)),
  };
}

function referenceKeys(references: ExistingEntityReference[]) {
  const keys = new Set<string>();
  references.forEach((reference) => {
    const id = positiveId(reference.id);
    const actorId = positiveId(reference.actor_id);
    const name = normalizeEntityName(reference.name);
    if (id) keys.add(`id:${id}`);
    if (actorId) keys.add(`id:${actorId}`);
    if (name) keys.add(`name:${name}`);
  });
  return keys;
}

function actorOptionKeys(option: ActorOption) {
  const keys = new Set<string>();
  const id = positiveId(option.id);
  const name = normalizeEntityName(option.name);
  if (id) keys.add(`id:${id}`);
  if (name) keys.add(`name:${name}`);
  return keys;
}

export function filterProjectEditorOptions<T extends ActorOption>(
  options: T[],
  scope: ProjectEditorScope,
  references: ExistingEntityReference[],
  role: string
): T[] {
  const roleOptions = options.filter(
    (option) => !option.roles?.length || option.roles.includes(role)
  );
  if (!scope.hasConcreteScope) return [];

  const allowedKeys = referenceKeys(references);
  if (allowedKeys.size === 0) return [];

  return roleOptions.filter((option) => {
    for (const key of actorOptionKeys(option)) {
      if (allowedKeys.has(key)) return true;
    }
    return false;
  });
}

export function collectTenantReferences(project: Project | null): ExistingEntityReference[] {
  return (project?.fields ?? []).flatMap((field) => field.investors ?? []);
}

export function filterScopedFieldOptions<T extends EntityOption & { project_id?: number | null }>(
  options: T[],
  scope: ProjectEditorScope,
  fields: Array<{ id: number }> = []
): T[] {
  if (!scope.projectId) return [];
  const draftFieldIds = new Set(fields.map((field) => field.id).filter((id) => id > 0));
  return options.filter(
    (option) => option.project_id === scope.projectId || draftFieldIds.has(option.id)
  );
}

export function filterScopedLotOptions<T extends EntityOption & { field_id?: number | null }>(
  options: T[],
  fieldId: number
): T[] {
  if (!fieldId || fieldId <= 0) return [];
  return options.filter((option) => option.field_id === fieldId);
}

export function collectScopedCropOptions(
  project: Project | null,
  cropOptions: EntityOption[]
): EntityOption[] {
  if (!project) return [];

  const cropKeys = new Map<number | string, EntityOption>();
  const addCrop = (id: number, name?: string) => {
    const trimmedName = name?.trim() ?? "";
    if (id > 0) {
      const existing = cropOptions.find((crop) => crop.id === id);
      cropKeys.set(id, existing ?? { id, name: trimmedName });
      return;
    }
    if (trimmedName) {
      const existing = cropOptions.find(
        (crop) => normalizeEntityName(crop.name) === normalizeEntityName(trimmedName)
      );
      if (existing) cropKeys.set(existing.id, existing);
    }
  };

  project.fields.forEach((field) => {
    field.lots.forEach((lot) => {
      addCrop(Number(lot.previous_crop_id), lot.previous_crop_name);
      addCrop(Number(lot.current_crop_id), lot.current_crop_name);
    });
  });

  return Array.from(cropKeys.values()).filter((crop) => crop.name.trim());
}
