import { AxiosError } from "axios";
import { createAuthenticatedAxiosClient } from "@devpablocristo/platform-authn/http/axios";
import { authTokenStorage } from "@/lib/authStorage";
import { httpErrorCopy } from "@/copy";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TIMEOUT = 30_000;

function isInvalidTokenError(error: unknown): boolean {
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  if (status !== 401 && status !== 403) {
    return false;
  }

  const data = axiosError.response?.data as unknown;
  const haystack =
    typeof data === "string"
      ? data
      : data && typeof data === "object"
        ? JSON.stringify(data)
        : "";

  const message = haystack.toLowerCase();
  return (
    message.includes("invalid token") ||
    message.includes("token inval") ||
    message.includes("token invál") ||
    message.includes("jwt") ||
    message.includes("signature") ||
    message.includes("expired")
  );
}

export const apiClient = createAuthenticatedAxiosClient({
  baseURL: BASE_URL,
  timeoutMs: TIMEOUT,
  tokenStorage: authTokenStorage,
  refreshRequest: {
    path: "/auth/access-token",
    method: "GET",
    useRefreshToken: true,
    mapResponse(data) {
      const payload = data as {
        access_token?: string;
        refresh_token?: string;
        data?: { access_token?: string; refresh_token?: string };
      };
      return {
        accessToken: payload.data?.access_token ?? payload.access_token ?? "",
        refreshToken: payload.data?.refresh_token ?? payload.refresh_token ?? null,
      };
    },
  },
  invalidTokenMatcher: isInvalidTokenError,
});

apiClient.raw().interceptors.request.use((config) => {
  if (config.headers?.["X-Skip-Tenant"]) {
    delete config.headers["X-Skip-Tenant"];
    return config;
  }
  const tenantId =
    window.localStorage.getItem("ponti:tenant_id") ||
    window.localStorage.getItem("tenant_id") ||
    "";
  if (tenantId.trim()) {
    config.headers["X-Tenant-Id"] = tenantId.trim();
  }
  return config;
});

// Envolvemos las responses 2xx en `{success: true, data: <body>}` porque los
// hooks legacy hacen `if (response.success) { ... response.data.X }` esperando
// esa shape. El BE devuelve el payload directo (sin `success`), así que sin
// este interceptor los dispatches nunca corren y las listas quedan vacías.
//
// IMPORTANTE: saltear cuando la response es binaria (Blob/ArrayBuffer) — los
// exports `responseType: "blob"` pasan por acá y no deben envolverse.
apiClient.raw().interceptors.response.use((response) => {
  if (!response) return response;

  const isBinaryResponse =
    response.config?.responseType === "blob" ||
    response.config?.responseType === "arraybuffer" ||
    response.data instanceof Blob ||
    response.data instanceof ArrayBuffer;

  if (isBinaryResponse) {
    return response;
  }

  if (response.data === undefined) {
    // 204 No Content y similares: garantizar que `response.success` sea true
    // para que los flujos de mutación no caigan al else.
    response.data = { success: true };
    return response;
  }

  if (
    typeof response.data === "object" &&
    response.data !== null &&
    !Object.prototype.hasOwnProperty.call(response.data, "success")
  ) {
    response.data = { success: true, data: response.data };
  }
  return response;
});

// Interceptor de errores global. Hace dos cosas:
//
//   1. Anota `error.userMessage` con la copy en español apropiada para
//      network / timeout / HTTP 401-403-404-409-422-5xx — así los hooks no
//      tienen que reimplementar la traducción por endpoint. Los errores con
//      un mensaje de dominio del BE (ej: "lot is archived") siguen llegando
//      intactos: `formatError` da prioridad a `translateBackendError` sobre
//      `userMessage`, así no perdemos contexto de negocio.
//   2. Si `isInvalidTokenError(error)` matchea (el refresh del platform ya
//      falló o no aplica), dispara el evento global `auth:force-logout` para
//      que `AuthProvider` limpie storage y redirija al login. Antes esta
//      lógica vivía duplicada en `useDashboard` con regex sobre `.message`;
//      ahora vive en un solo lugar y aplica a TODOS los hooks.
apiClient.raw().interceptors.response.use(undefined, (error) => {
  const copy = httpErrorCopy(error);
  if (copy && error && typeof error === "object") {
    (error as { userMessage?: string }).userMessage = copy;
  }
  if (isInvalidTokenError(error) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:force-logout"));
  }
  return Promise.reject(error);
});
