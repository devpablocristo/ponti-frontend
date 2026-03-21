import { AxiosError } from "axios";
import { createAuthenticatedAxiosClient } from "@devpablocristo/core-authn/http/axios";
import { authTokenStorage } from "@/pages/login/context/useLocalStorage";

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
