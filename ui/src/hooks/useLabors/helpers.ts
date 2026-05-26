import { LaborInfo } from "./types";

/**
 * El BE puede devolver un detalle por labor con un prefijo machine-readable
 * como `CONFLICT: labor already exists in this project` (ver
 * `internal/labor/usecases.go`). Lo mapeamos al copy en español acá porque
 * el detail viene como parte de un payload de éxito parcial, no como axios
 * error — formatError no aplica.
 */
export function translateLaborDetail(message: string): string {
  const normalized = message.trim();
  if (normalized === "CONFLICT: labor already exists in this project") {
    return "La labor ya existe en este proyecto.";
  }
  return message;
}

/**
 * El endpoint `/projects/:id/labors` puede devolver el array de labors en
 * dos formas (paginated vs flat). Normalizamos a array.
 */
export function extractLaborsArray(payload: unknown): LaborInfo[] {
  if (Array.isArray(payload)) {
    return payload as LaborInfo[];
  }
  if (payload && typeof payload === "object") {
    const directData = (payload as { data?: unknown }).data;
    if (Array.isArray(directData)) {
      return directData as LaborInfo[];
    }
    if (directData && typeof directData === "object") {
      const nestedData = (directData as { data?: unknown }).data;
      if (Array.isArray(nestedData)) {
        return nestedData as LaborInfo[];
      }
    }
  }
  return [];
}
