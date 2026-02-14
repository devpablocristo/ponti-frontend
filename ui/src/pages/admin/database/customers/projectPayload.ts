import type { Field as FormField, Plot as FormPlot } from "./Fields";
import type { Field as ProjectFieldPayload } from "../../../../hooks/useDatabase/projects/types";

type NormalizedDecimalResult = {
  value: number | null;
  error?: string;
};

const NUMERIC_STRING_REGEX = /^-?\d+(?:\.\d+)?$/;

export const normalizeNullableDecimal = (
  value: unknown
): NormalizedDecimalResult => {
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

const mapPlot = (plot: FormPlot, editing: boolean) => ({
  id: editing ? plot.id || 0 : 0,
  name: plot.name,
  hectares: Number(plot.hectares),
  previous_crop_id: Number(plot.previousCrop.id),
  previous_crop_name: plot.previousCrop.name,
  current_crop_id: Number(plot.currentCrop.id),
  current_crop_name: plot.currentCrop.name,
  season: plot.season || "",
});

export const mapProjectFieldsPayload = (
  fields: FormField[],
  editing: boolean
): { fields: ProjectFieldPayload[]; errors: string[] } => {
  const errors: string[] = [];

  const mapped = fields.map((field, index) => {
    const percent = normalizeNullableDecimal(field.leaseTypePercent);
    const value = normalizeNullableDecimal(field.leaseTypeValue);

    if (percent.error) {
      errors.push(`fields[${index}].lease_type_percent ${percent.error}`);
    }
    if (value.error) {
      errors.push(`fields[${index}].lease_type_value ${value.error}`);
    }

    return {
      id: editing ? field.id || 0 : 0,
      name: field.name,
      lease_type_id: Number(field.leaseType),
      lease_type_percent: percent.value,
      lease_type_value: value.value,
      investors: Array.isArray(field.investors) ? field.investors : [],
      lots: Array.isArray(field.plots)
        ? field.plots.map((plot) => mapPlot(plot, editing))
        : [],
    };
  });

  return { fields: mapped, errors };
};

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
