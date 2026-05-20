import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { findEntityMatches, normalizeEntityName } from "../../../../lib/entityNameMatcher";

type NormalizedDecimalResult = {
  value: number | null;
  error?: string;
};

type BuildProjectPayloadOptions = {
  editing: boolean;
};

type ValidateProjectOptions = {
  customerOnly?: boolean;
};

export type PercentageActorEntity = {
  id: number | null;
  actor_id?: number | null;
  name: string;
  percentage: number;
};

type NamedEntity = {
  id: number | null;
  actor_id?: number | null;
  name: string;
};

const NUMERIC_STRING_REGEX = /^-?\d+(?:\.\d+)?$/;

export const normalizeNullableDecimal = (value: unknown): NormalizedDecimalResult => {
  if (value === null || value === undefined) {
    return { value: null };
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return { value };
    }
    return { value: null, error: "Debe ser un número válido." };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return { value: null };
    }
    if (!NUMERIC_STRING_REGEX.test(trimmed)) {
      return { value: null, error: "Debe ser numérico." };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { value: null, error: "Debe ser un número válido." };
    }

    return { value: parsed };
  }

  return { value: null, error: "Debe ser numérico." };
};

export function hasActorEntityValue(entity: PercentageActorEntity): boolean {
  return Boolean(entity.name.trim() || entity.id || entity.actor_id);
}

function hasNamedEntityValue(entity: NamedEntity): boolean {
  return Boolean(entity.name.trim() || entity.id || entity.actor_id);
}

function numericValue(value: unknown): number {
  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }
  return Number(value);
}

function idForPayload(id: number | null | undefined, editing: boolean): number {
  const numericId = Number(id ?? 0);
  return editing && numericId > 0 ? numericId : 0;
}

function normalizedEntityKey(entity: PercentageActorEntity): string {
  if (entity.actor_id) return `actor:${entity.actor_id}`;
  if (entity.id) return `id:${entity.id}`;
  return `name:${normalizeEntityName(entity.name)}`;
}

function formatPercentTotal(total: number): string {
  return Number(total.toFixed(3)).toString();
}

export function validatePercentageGroup(
  label: string,
  entities: PercentageActorEntity[],
  options: { allowEmpty?: boolean } = {}
): string | null {
  const activeEntities = entities.filter(hasActorEntityValue);

  if (activeEntities.length === 0) {
    return options.allowEmpty ? null : `${label}: agregá al menos un registro.`;
  }

  const seen = new Set<string>();
  for (const entity of activeEntities) {
    if (!entity.name.trim() && !entity.id && !entity.actor_id) {
      return `${label}: seleccioná o escribí un nombre.`;
    }

    const percentage = Number(entity.percentage);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return `${label}: cada porcentaje debe ser mayor a 0 y menor o igual a 100.`;
    }

    const key = normalizedEntityKey(entity);
    if (seen.has(key)) {
      return `${label}: no puede repetirse el mismo actor.`;
    }
    seen.add(key);
  }

  const total = activeEntities.reduce((sum, entity) => sum + Number(entity.percentage), 0);
  if (Math.abs(total - 100) > 0.001) {
    return `${label}: la suma de porcentajes debe ser 100% (hoy ${formatPercentTotal(total)}%).`;
  }

  return null;
}

function isEmptyLot(lot: Project["fields"][number]["lots"][number]): boolean {
  return (
    !lot.name.trim() &&
    !numericValue(lot.hectares) &&
    !Number(lot.previous_crop_id) &&
    !lot.previous_crop_name?.trim() &&
    !Number(lot.current_crop_id) &&
    !lot.current_crop_name?.trim() &&
    !lot.season.trim()
  );
}

function sanitizeNamedEntity<T extends NamedEntity>(entity: T): T {
  return {
    ...entity,
    name: entity.name.trim(),
  };
}

function sanitizePercentageEntity<T extends PercentageActorEntity>(entity: T): T {
  return {
    ...entity,
    id: entity.id ?? 0,
    name: entity.name.trim(),
    percentage: Number(entity.percentage),
  };
}

export function buildProjectPayloadForSave(
  project: Project,
  options: BuildProjectPayloadOptions
): { project: Project; errors: string[] } {
  const errors: string[] = [];

  return {
    project: {
      ...project,
      name: project.name.trim(),
      customer: sanitizeNamedEntity(project.customer),
      campaign: sanitizeNamedEntity(project.campaign),
      managers: Array.isArray(project.managers)
        ? project.managers.filter(hasNamedEntityValue).map(sanitizeNamedEntity)
        : [],
      investors: Array.isArray(project.investors)
        ? project.investors.filter(hasActorEntityValue).map(sanitizePercentageEntity)
        : [],
      admin_cost_investors: Array.isArray(project.admin_cost_investors)
        ? project.admin_cost_investors.filter(hasActorEntityValue).map(sanitizePercentageEntity)
        : [],
      admin_cost: numericValue(project.admin_cost),
      planned_cost: numericValue(project.planned_cost),
      fields: Array.isArray(project.fields)
        ? project.fields.map((field, index) => {
            const percent = normalizeNullableDecimal(field.lease_type_percent);
            const value = normalizeNullableDecimal(field.lease_type_value);

            if (percent.error) {
              errors.push(`fields[${index}].lease_type_percent ${percent.error}`);
            }
            if (value.error) {
              errors.push(`fields[${index}].lease_type_value ${value.error}`);
            }

            const leaseTypeId = Number(field.lease_type_id);
            const requiresPercent = leaseTypeId === 1 || leaseTypeId === 2 || leaseTypeId === 4;
            if (
              requiresPercent &&
              percent.value !== null &&
              (percent.value <= 0 || percent.value > 100)
            ) {
              errors.push(`fields[${index}].lease_type_percent debe estar entre 1 y 100.`);
            }

            return {
              ...field,
              id: idForPayload(field.id, options.editing),
              name: field.name.trim(),
              lease_type_id: Number(field.lease_type_id || 0),
              lease_type_name: field.lease_type_name?.trim(),
              lease_type_percent: percent.value,
              lease_type_value: value.value,
              investors: Array.isArray(field.investors)
                ? field.investors.filter(hasActorEntityValue).map((investor) => ({
                    ...sanitizePercentageEntity(investor),
                    id: investor.id ?? 0,
                  }))
                : [],
              lots: Array.isArray(field.lots)
                ? field.lots.filter((lot) => !isEmptyLot(lot)).map((lot) => ({
                    ...lot,
                    id: idForPayload(lot.id, options.editing),
                    name: lot.name.trim(),
                    hectares: numericValue(lot.hectares),
                    previous_crop_id: Number(lot.previous_crop_id || 0),
                    previous_crop_name: lot.previous_crop_name?.trim(),
                    current_crop_id: Number(lot.current_crop_id || 0),
                    current_crop_name: lot.current_crop_name?.trim(),
                    season: lot.season.trim(),
                  }))
                : [],
            };
          })
        : [],
    },
    errors,
  };
}

function hasCropValue(id: number, name?: string): boolean {
  return Number(id) > 0 || Boolean(name?.trim());
}

function isNonNegativeFinite(value: unknown): boolean {
  const numeric = numericValue(value);
  return Number.isFinite(numeric) && numeric >= 0;
}

export function validateProjectForSave(
  project: Project,
  options: ValidateProjectOptions = {}
): string[] {
  const errors: string[] = [];

  if (!project.customer.name.trim() && !project.customer.id && !project.customer.actor_id) {
    errors.push("Cliente / Sociedad: seleccioná o escribí un cliente.");
  }

  if (options.customerOnly) {
    return errors;
  }

  if (!project.name.trim()) {
    errors.push("Proyecto: ingresá un nombre.");
  }

  if (!project.campaign.name.trim() && !project.campaign.id) {
    errors.push("Campaña: seleccioná o escribí una campaña.");
  }

  if (!Array.isArray(project.managers) || project.managers.length === 0) {
    errors.push("Responsables: agregá al menos un responsable.");
  }

  if (!isNonNegativeFinite(project.planned_cost)) {
    errors.push("Costo planificado: debe ser un número no negativo con hasta 2 decimales.");
  }

  if (!isNonNegativeFinite(project.admin_cost)) {
    errors.push("Costo administrativo: debe ser un número no negativo con hasta 2 decimales.");
  }

  const investorsError = validatePercentageGroup("Inversores", project.investors ?? []);
  if (investorsError) errors.push(investorsError);

  const adminCostError = validatePercentageGroup(
    "Costo administrativo",
    project.admin_cost_investors ?? []
  );
  if (adminCostError) errors.push(adminCostError);

  if (!Array.isArray(project.fields) || project.fields.length === 0) {
    errors.push("Campos: agregá al menos un campo.");
    return errors;
  }

  project.fields.forEach((field, fieldIndex) => {
    const fieldLabel = `Campo ${fieldIndex + 1}`;

    if (!field.name.trim()) {
      errors.push(`${fieldLabel}: ingresá un nombre.`);
    }

    if (!Number(field.lease_type_id)) {
      errors.push(`${fieldLabel}: seleccioná un tipo de arriendo.`);
    }

    const fieldInvestorsError = validatePercentageGroup(
      `Arrendatarios del ${fieldLabel.toLowerCase()}`,
      field.investors ?? [],
      { allowEmpty: true }
    );
    if (fieldInvestorsError) errors.push(fieldInvestorsError);

    if (!Array.isArray(field.lots) || field.lots.length === 0) {
      errors.push(`${fieldLabel}: agregá al menos un lote.`);
      return;
    }

    field.lots.forEach((lot, lotIndex) => {
      const lotLabel = `${fieldLabel}, lote ${lotIndex + 1}`;
      const hectares = numericValue(lot.hectares);

      if (!lot.name.trim()) {
        errors.push(`${lotLabel}: ingresá un nombre.`);
      }

      if (!Number.isFinite(hectares) || hectares <= 0) {
        errors.push(`${lotLabel}: las hectáreas deben ser mayores a 0.`);
      }

      if (!hasCropValue(lot.previous_crop_id, lot.previous_crop_name)) {
        errors.push(`${lotLabel}: seleccioná o escribí el cultivo anterior.`);
      }

      if (!hasCropValue(lot.current_crop_id, lot.current_crop_name)) {
        errors.push(`${lotLabel}: seleccioná o escribí el cultivo actual.`);
      }

      if (!lot.season.trim()) {
        errors.push(`${lotLabel}: seleccioná un período.`);
      }
    });
  });

  return errors;
}

export const parseProjectFieldErrorMessage = (message: string): string | null => {
  const match = message.match(/fields\[(\d+)\]\.([a-z_]+)/i);
  if (!match) {
    return null;
  }

  const fieldIndex = Number(match[1]) + 1;
  const fieldKey = match[2];

  const labels: Record<string, string> = {
    investors: "inversores",
    lots: "lotes",
    lease_type_percent: "porcentaje de arriendo",
    lease_type_value: "valor de arriendo",
  };

  const label = labels[fieldKey] || fieldKey;
  return `Campo ${fieldIndex}: ${label}.`;
};

export function formatValidationErrors(errors: string[]): string {
  return Array.from(new Set(errors)).join("\n");
}

export type IdentityOption = {
  id: number | string;
  name?: string;
  customer_id?: number | null;
};

type IdentityEntity = {
  id?: number | null;
  actor_id?: number | null;
  name: string;
};

// validateActorIdentity returns an error message when the typed name matches
// an existing actor option that is NOT the one assigned to this slot. It is
// the only duplicate guard kept in the editor after removing the explicit
// "Nuevo" button: a slot may freely rename its assigned actor, but cannot
// silently steal the identity of a different one.
export function validateActorIdentity(
  label: string,
  entity: IdentityEntity,
  options: IdentityOption[]
): string | null {
  const name = entity.name.trim();
  if (!name) return null;

  const match = findEntityMatches(name, options);
  if (!match.exactMatch) return null;

  const matchedActorId =
    typeof match.exactMatch.id === "number" ? match.exactMatch.id : null;
  const assignedActorId = entity.actor_id ?? null;
  if (assignedActorId !== null && matchedActorId === assignedActorId) {
    return null;
  }

  return `Ya existe "${match.exactMatch.name ?? name}" en ${label}. Seleccionalo desde la lista.`;
}

// validateCustomerIdentity is a thin wrapper around validateActorIdentity
// for the project's customer slot. The semantics match the customer actor
// options, which carry both `id` (actor id) and `customer_id` (legacy id).
export function validateCustomerIdentity(
  customer: IdentityEntity,
  options: IdentityOption[]
): string | null {
  const name = customer.name.trim();
  if (!name) return null;

  const match = findEntityMatches(name, options);
  if (!match.exactMatch) return null;

  const matchedActorId =
    typeof match.exactMatch.id === "number" ? match.exactMatch.id : null;
  const matchedCustomerId =
    typeof match.exactMatch.customer_id === "number"
      ? match.exactMatch.customer_id
      : null;
  const assignedActorId = customer.actor_id ?? null;
  const assignedCustomerId = customer.id ?? null;

  const sameByActor =
    assignedActorId !== null && matchedActorId === assignedActorId;
  const sameByCustomer =
    assignedCustomerId !== null && matchedCustomerId === assignedCustomerId;
  if (sameByActor || sameByCustomer) return null;

  return `Ya existe un cliente con el nombre "${
    match.exactMatch.name ?? name
  }". Seleccionalo del dropdown.`;
}
