// formatError — único punto de entrada para presentar errores al usuario.
//
// Orden de prioridad:
//   1. `error.userMessage` (lo pobló el interceptor axios global para
//      network/timeout/401-403-404-409-500).
//   2. `translateBackendError` aplicado al mensaje crudo del BE (cubre
//      patterns de dominio: "lot is archived", "X already exists", etc.).
//   3. `fallback` provisto por el caller (último recurso, ya en español).
//
// El caller pasa un `fallback` que SIEMPRE está en español. La función
// devuelve un string listo para `<Notification>`, `notify.error`, o
// `setError`. Nunca retorna ingles crudo si el BE devolvió un patron
// conocido.

import { translateBackendError } from "@/lib/translateBackendError";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

export type FormatErrorOptions = {
  /** Mensaje en español a mostrar si nada matchea. Obligatorio para evitar fallbacks vacíos o crípticos. */
  fallback: string;
};

/**
 * El interceptor axios pobla `err.userMessage` con copy ya en español para
 * casos de red / status genéricos. El type-guard evita romper si llega
 * cualquier otro tipo de excepción.
 */
function readInterceptorMessage(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate = (err as { userMessage?: unknown }).userMessage;
  return typeof candidate === "string" && candidate.trim() !== ""
    ? candidate
    : undefined;
}

export function formatError(err: unknown, opts: FormatErrorOptions): string {
  // 1) Interceptor: network / timeout / status genéricos
  const interceptorMsg = readInterceptorMessage(err);

  // 2) Mensaje crudo del BE traducido (puede devolver el raw si no matchea)
  const rawBackend = extractErrorMessage(err, "");
  const translated = rawBackend ? translateBackendError(rawBackend) : "";
  const hasTranslated = translated && translated !== rawBackend;

  // Si el BE devolvió un mensaje conocido (matcheó un pattern), gana.
  // Es más específico que el copy genérico del interceptor.
  if (hasTranslated) return translated;

  // Si el interceptor clasificó el error (red, 401, 500, etc.), úsalo.
  if (interceptorMsg) return interceptorMsg;

  // Si el BE devolvió algo pero no matcheó traducción, devolvelo igual:
  // mejor algo del BE que un fallback genérico (puede ser un mensaje
  // ya en español como los validations del usecase). Loguear en dev para
  // detectar patterns nuevos.
  if (rawBackend) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[formatError] mensaje del BE sin traducción registrada:",
        rawBackend,
      );
    }
    return rawBackend;
  }

  // 3) Fallback en español del caller
  return opts.fallback;
}
