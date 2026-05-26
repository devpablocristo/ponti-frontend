// fetchErrorAdapter — normaliza errores de fetch (no-axios) para que pasen por
// el pipeline unificado `formatError`.
//
// Por qué existe: `aiClient.ts` e `insightsClient.ts` usan Fetch directo (no
// axios) porque necesitan streams SSE / control fino del body. Eso bypassea
// el interceptor global de `client.ts` que anota `userMessage`. Resultado
// antes: el caller recibía un `Error` con `message = response body crudo`
// (JSON técnico) y lo mostraba al usuario. Esto cierra ese leak.
//
// `FetchApiError` extiende `Error` y mimicka la shape de `AxiosError` (campo
// `response.data` + `response.status` + `userMessage`) para que las dos
// utilidades existentes del pipeline funcionen sin cambios:
//   - `extractErrorMessage(err)` (en `api/hooks/useApiCall.ts`) — lee
//     `response.data.message` para pasarlo a `translateBackendError`.
//   - `readInterceptorMessage(err)` (en `lib/format/formatError.ts`) — lee
//     `err.userMessage` (en español) para los casos de network / status
//     genéricos.

import { HTTP_COPY } from "@/copy/http";

type FetchApiErrorOptions = {
  /** Mensaje técnico que va a `Error.message`. Sólo para logs de dev / Sentry. */
  technicalMessage: string;
  /** Copy en español que el FE muestra al usuario. */
  userMessage: string;
  /** Status HTTP (0 si no llegó respuesta, ej. network error). */
  status: number;
  /** Code del body JSON del BE (ej. `VALIDATION_ERROR`, `FORBIDDEN`). */
  backendCode?: string;
  /** Message crudo del body JSON del BE (puede matchear patterns de `translateBackendError`). */
  backendMessage?: string;
};

/**
 * Error custom que el pipeline de formato trata igual que un `AxiosError`
 * post-interceptor. NUNCA exponer `message` directamente al usuario — solo
 * `userMessage`.
 */
export class FetchApiError extends Error {
  readonly userMessage: string;
  readonly response: {
    status: number;
    data: { message?: string; code?: string };
  };

  constructor(opts: FetchApiErrorOptions) {
    super(opts.technicalMessage);
    this.name = "FetchApiError";
    this.userMessage = opts.userMessage;
    this.response = {
      status: opts.status,
      data: { message: opts.backendMessage, code: opts.backendCode },
    };
  }
}

/**
 * Mapea status HTTP a la copy en español de `HTTP_COPY`.
 * Sigue las mismas reglas que `classifyHttpError` en `copy/http.ts` para
 * mantener consistencia con el flujo axios.
 */
function userMessageForStatus(status: number): string {
  if (status === 401) return HTTP_COPY.unauthorized;
  if (status === 403) return HTTP_COPY.forbidden;
  if (status === 404) return HTTP_COPY.notFound;
  if (status === 409) return HTTP_COPY.conflict;
  if (status === 422) return HTTP_COPY.validation;
  if (status >= 400 && status < 500) return HTTP_COPY.validation;
  if (status >= 500) return HTTP_COPY.serverError;
  return HTTP_COPY.unknown;
}

/**
 * Convierte una `Response` Fetch no-OK en un `FetchApiError`.
 * Llamar `await wrapFetchResponse(res)` solo cuando `!res.ok`.
 */
export async function wrapFetchResponse(res: Response): Promise<FetchApiError> {
  let bodyText = "";
  let parsedJSON: { message?: string; code?: string } | null = null;
  try {
    bodyText = await res.text();
    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText) as unknown;
        if (parsed && typeof parsed === "object") {
          parsedJSON = parsed as { message?: string; code?: string };
        }
      } catch {
        // no era JSON; mantenemos bodyText para el technicalMessage
      }
    }
  } catch {
    // res.text() falló (raro). Seguimos sin body.
  }

  return new FetchApiError({
    technicalMessage: `fetch ${res.status} ${res.url}: ${bodyText.slice(0, 200)}`,
    userMessage: userMessageForStatus(res.status),
    status: res.status,
    backendCode: parsedJSON?.code,
    backendMessage: parsedJSON?.message,
  });
}

/**
 * Convierte un error de transporte (network/abort/timeout) en `FetchApiError`.
 * Usar en el `catch` que envuelve la llamada a `fetch()`.
 */
export function wrapFetchNetworkError(err: unknown): FetchApiError {
  const technical = err instanceof Error ? err.message : String(err);
  let userMessage: string = HTTP_COPY.network;

  // AbortError surge cuando el caller cancela con AbortSignal — no es un
  // problema de red real. Lo dejamos pasar como network porque el usuario
  // ya navegó fuera o canceló; en la práctica el caller suele filtrarlo.
  if (err instanceof Error && err.name === "TimeoutError") {
    userMessage = HTTP_COPY.timeout;
  }

  return new FetchApiError({
    technicalMessage: technical,
    userMessage,
    status: 0,
  });
}

/**
 * Helper para clientes Fetch: ejecuta el fetch y lanza `FetchApiError` si
 * no-OK o si hay error de red. El caller hace `await fetchOrThrow(...)`
 * y maneja el error con `formatError(err, { fallback })`.
 *
 * Se usa para llamadas no-stream. Para SSE, ver `parseFetchStreamError`.
 */
export async function fetchOrThrow(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    throw wrapFetchNetworkError(err);
  }
  if (!res.ok) {
    throw await wrapFetchResponse(res);
  }
  return res;
}
