import type { CustomerData } from "../../../../hooks/useCustomers/types";
import type { Project } from "../../../../hooks/useDatabase/projects/types";

import type { ActorOption, EntityOption, EntityOptionsPayload, SelectionValue } from "./types";

/**
 * Constantes y funciones puras del CustomerEditor. Extraídas para reducir
 * el peso del componente. Sin side-effects, sin React, todas testeables.
 */

export const NEW_VALUE = "new";

export const COST_INPUT_REGEX = /^\d*(?:[.,]\d{0,2})?$/;
export const HECTARES_INPUT_REGEX = /^\d*(?:[.,]\d{0,3})?$/;

export const SEASON_OPTIONS: EntityOption[] = [
  { id: 1, name: "Otoño" },
  { id: 2, name: "Invierno" },
  { id: 3, name: "Primavera" },
  { id: 4, name: "Verano" },
];

// Natural agricultural cycle (Argentine southern-hemisphere convention) used
// for auto-rotating crops when the user advances the lot's season by one
// step. Cycle: Verano(4) → Otoño(1) → Invierno(2) → Primavera(3) → Verano(4).
export const SEASON_ID_CYCLE = [4, 1, 2, 3];

export function isSeasonOneStepForward(oldValue: string, newValue: string): boolean {
  if (!oldValue || !newValue || oldValue === newValue) return false;
  const oldId = Number(oldValue);
  const newId = Number(newValue);
  if (!oldId || !newId) return false;
  const oldIdx = SEASON_ID_CYCLE.indexOf(oldId);
  const newIdx = SEASON_ID_CYCLE.indexOf(newId);
  if (oldIdx === -1 || newIdx === -1) return false;
  return newIdx === (oldIdx + 1) % SEASON_ID_CYCLE.length;
}

export function extractEntityOptions(
  payload: EntityOptionsPayload | undefined,
): EntityOption[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export const emptyFieldInvestor = () => ({
  id: 0,
  actor_id: null,
  name: "",
  percentage: 0,
});

export function normalizeDecimalInputValue(value: string): number | null {
  const normalized = value.replace(",", ".");
  const parsed = normalized === "" ? 0 : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoundedPercentage(value: string): number | null {
  const parsed = normalizeDecimalInputValue(value);
  if (parsed === null || parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function isExistingId(value: SelectionValue): value is number {
  return typeof value === "number" && value > 0;
}

export function numericActorId(actor: ActorOption): number | null {
  return typeof actor.id === "number" ? actor.id : null;
}

export function createEmptyProject(customer?: CustomerData | null): Project {
  return {
    name: "",
    customer: {
      id: customer?.id ?? null,
      actor_id: customer?.actor_id ?? null,
      name: customer?.name ?? "",
    },
    campaign: {
      id: null,
      name: "",
    },
    managers: [{ id: 0, name: "" }],
    investors: [{ id: 0, name: "", percentage: 0 }],
    admin_cost_investors: [{ id: 0, name: "", percentage: 0 }],
    admin_cost: 0,
    planned_cost: 0,
    fields: [
      {
        id: -Date.now(),
        name: "",
        lease_type_id: 0,
        lease_type_percent: "",
        lease_type_value: "",
        investors: [emptyFieldInvestor()],
        lots: [
          {
            id: 0,
            name: "",
            hectares: 0,
            previous_crop_id: 0,
            previous_crop_name: "",
            current_crop_id: 0,
            current_crop_name: "",
            season: "",
          },
        ],
      },
    ],
    updated_at: undefined,
  };
}

export function normalizeProject(project: Project): Project {
  return {
    ...project,
    customer: project.customer ?? { id: null, name: "" },
    campaign: project.campaign ?? { id: null, name: "" },
    managers: Array.isArray(project.managers) ? project.managers : [],
    investors: Array.isArray(project.investors) ? project.investors : [],
    admin_cost_investors: Array.isArray(project.admin_cost_investors)
      ? project.admin_cost_investors
      : [],
    fields: Array.isArray(project.fields)
      ? project.fields.map((field) => ({
          ...field,
          investors:
            Array.isArray(field.investors) && field.investors.length > 0
              ? field.investors
              : [emptyFieldInvestor()],
          lots: Array.isArray(field.lots) ? field.lots : [],
        }))
      : [],
  };
}
