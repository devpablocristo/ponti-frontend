import { HttpError } from "@devpablocristo/core-http/fetch";

import type { DecodedToken } from "@/pages/login/types";

export const SOD_CONFLICT_MESSAGE =
  "No podés aprobar una solicitud creada por vos (segregación de funciones)";
export const FORBIDDEN_MESSAGE = "Tu rol no permite aprobar este tipo de acción";
export const EXPIRED_MESSAGE = "La solicitud expiró antes de registrarse la decisión.";
export const GENERIC_DECISION_ERROR = "No se pudo registrar la decisión.";

/**
 * Identidad del usuario tal como la propaga el BFF al core
 * (X-User-Id = sub || ID del JWT decodificado).
 */
export const currentUserSubject = (user: DecodedToken | null): string | null => {
  if (!user) return null;
  const subject = user.sub ?? (user.ID !== undefined && user.ID !== null ? String(user.ID) : null);
  return subject && String(subject).trim() !== "" ? String(subject).trim() : null;
};

/** requested_by llega como "user:<sub>" (registros viejos pueden traer el sub pelado). */
export const isRequestedBySubject = (
  requestedBy: string | undefined,
  subject: string | null
): boolean => {
  if (!requestedBy || !subject) return false;
  const normalized = requestedBy.startsWith("user:") ? requestedBy.slice("user:".length) : requestedBy;
  return normalized === subject;
};

/** Mensajes placeholder del stack BFF/ApiClient que no aportan al usuario. */
const GENERIC_UPSTREAM_MESSAGES = new Set([
  "Error en la solicitud",
  "Error inesperado",
  "Detalles no disponibles",
  "No se pudo procesar la solicitud",
]);

const meaningfulMessage = (err: HttpError): string => {
  const message = err.message?.trim() ?? "";
  if (!message || GENERIC_UPSTREAM_MESSAGES.has(message)) return "";
  return message;
};

export type DecisionErrorInfo = {
  message: string;
  /** true => la request ya no está vigente (expiró / no existe): refrescar el inbox. */
  refresh: boolean;
};

/**
 * Mapea errores de approve/reject al mensaje user-facing.
 * 409 = segregación de funciones (o el conflicto que reporte Nexus),
 * 403 = rol sin permiso, 410/404 = request vencida o resuelta en Nexus.
 */
export const decisionErrorInfo = (err: unknown): DecisionErrorInfo => {
  if (err instanceof HttpError) {
    const detail = meaningfulMessage(err);
    switch (err.status) {
      case 409:
        return { message: detail || SOD_CONFLICT_MESSAGE, refresh: false };
      case 403:
        return { message: FORBIDDEN_MESSAGE, refresh: false };
      case 410:
        return { message: EXPIRED_MESSAGE, refresh: true };
      case 404:
        return { message: detail || "La solicitud ya no existe en Nexus.", refresh: true };
      default:
        return { message: detail || GENERIC_DECISION_ERROR, refresh: false };
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return { message: err.message, refresh: false };
  }
  return { message: GENERIC_DECISION_ERROR, refresh: false };
};
