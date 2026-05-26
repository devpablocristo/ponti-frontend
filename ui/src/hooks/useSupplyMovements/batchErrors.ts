import type { AxiosError } from "axios";

import { BatchErrorPayload } from "./types";

/**
 * Helpers para procesar errores batch del endpoint POST /supply_movements/*.
 * El BE devuelve `{ supply_movements: [{ is_saved, error_detail, ... }] }` o
 * `{ failures: [{ index, message }] }`. Estos helpers normalizan a un único
 * mensaje legible (con números de fila) para mostrar al usuario.
 */
export function getBatchErrorData(error: unknown): BatchErrorPayload | undefined {
  const axiosError = error as AxiosError<BatchErrorPayload>;
  return axiosError?.response?.data ?? (error as BatchErrorPayload | undefined);
}

export function getBatchErrorMessage(error: unknown): string {
  const data = getBatchErrorData(error);

  if (!data) {
    return "No se pudo importar el movimiento. Verificá los datos del archivo.";
  }

  const failures = data.failures ?? data.error?.context?.failures;
  const supplyMovements =
    data.supply_movements ?? data.error?.context?.supply_movements;

  if (Array.isArray(failures) && failures.length > 0) {
    return failures
      .map((failure) => {
        const row = typeof failure.index === "number" ? failure.index + 2 : "?";
        return `Fila ${row}: ${failure.message ?? "Error de validación"}`;
      })
      .join("\n");
  }

  if (Array.isArray(supplyMovements) && supplyMovements.length > 0) {
    const details = supplyMovements
      .map((movement, index) =>
        movement.error_detail
          ? `Fila ${index + 2}: ${movement.error_detail}`
          : null,
      )
      .filter(Boolean);

    if (details.length > 0) {
      return details.join("\n");
    }
  }

  if (
    typeof data.error?.details === "string" &&
    data.error.details.trim() !== ""
  ) {
    return data.error.details;
  }

  if (typeof data.message === "string" && data.message.trim() !== "") {
    return data.message;
  }

  return "No se pudo importar el movimiento. Verificá los datos del archivo.";
}
