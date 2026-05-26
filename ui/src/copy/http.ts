// Mapping de errores de red / HTTP a copy en español.
//
// El interceptor axios global pobla `error.userMessage` con uno de estos
// strings ANTES de que el catch del hook reciba el error. Así cada hook
// deja de ocuparse de "network error" / "timeout" / 401-403-404-409-500 y
// solo se preocupa por errores BE específicos (que llegan con un mensaje
// del dominio que `translateBackendError` traduce).

export type HttpErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "serverError"
  | "unknown";

export const HTTP_COPY: Record<HttpErrorKind, string> = {
  network: "No se pudo conectar con el servidor. Verificá tu conexión a internet.",
  timeout: "El servidor tardó demasiado en responder. Intentá nuevamente en unos segundos.",
  unauthorized: "Tu sesión expiró. Iniciá sesión nuevamente.",
  forbidden: "No tenés permisos para realizar esta acción.",
  notFound: "El recurso solicitado no existe o fue eliminado.",
  conflict: "Ya existe un registro con esa información.",
  validation: "Los datos enviados no son válidos. Revisá los campos del formulario.",
  serverError: "Ocurrió un error interno. Intentá nuevamente en unos minutos.",
  unknown: "Ocurrió un error inesperado. Si el problema persiste, contactá a soporte.",
};

/**
 * Clasifica un error de axios en una categoría HTTP. NO lee el mensaje del
 * BE — eso queda para `translateBackendError`. Esta función solo mira
 * `error.code`, `error.response?.status`, y si el error es de transporte.
 *
 * `null` si el error no es de axios (programación, etc.).
 */
export function classifyHttpError(error: unknown): HttpErrorKind | null {
  if (!error || typeof error !== "object") return null;

  const e = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
    request?: unknown;
  };

  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return "timeout";
  if (e.code === "ERR_NETWORK") return "network";

  // Axios sets `request` but no `response` cuando la request salió pero
  // no llegó nada de vuelta (offline, DNS, etc.). Esto cubre el caso
  // `error.message === "Network Error"` clásico.
  if (e.request && !e.response) return "network";

  const status = e.response?.status;
  if (status === undefined) return null;

  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  // 422 se discrimina explícito antes del 4xx genérico — su copy es la
  // misma que validation hoy, pero queda explícito para futura customización.
  if (status === 422) return "validation";
  if (status >= 400 && status < 500) return "validation";
  if (status >= 500) return "serverError";

  return null;
}

/** Devuelve la copy para una categoría HTTP, o `undefined` si no clasifica. */
export function httpErrorCopy(error: unknown): string | undefined {
  const kind = classifyHttpError(error);
  return kind ? HTTP_COPY[kind] : undefined;
}
