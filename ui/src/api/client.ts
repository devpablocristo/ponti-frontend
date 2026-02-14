import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  getRefreshToken,
  clearLocalStorage,
  setAccessToken,
} from "@/pages/login/context/useLocalStorage";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TIMEOUT = 30_000;

/* ------------------------------------------------------------------ */
/*  Refresh-token queue: classic isRefreshing + failedQueue pattern   */
/* ------------------------------------------------------------------ */

let isRefreshing = false;

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((entry) => {
    if (token) {
      entry.resolve(token);
    } else {
      entry.reject(error);
    }
  });
  failedQueue = [];
}

/* ------------------------------------------------------------------ */

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });
    this.client.interceptors.request.use(this.attachToken);
    this.client.interceptors.response.use((r) => r, this.handleError);
  }

  /* ---------- request interceptor ---------- */

  private attachToken = (config: InternalAxiosRequestConfig) => {
    const url = config.url || "";

    if (url === "/auth/access-token") {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        config.headers.Authorization = `Bearer ${refreshToken}`;
      }
    } else {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  };

  /* ---------- response interceptor (401 + refresh queue) ---------- */

  private handleError = async (error: AxiosError) => {
    const originalRequest = error.config;

    // Bail out if:
    //  - no config (shouldn't happen)
    //  - not a 401
    //  - already retried this request
    //  - the failing request IS the refresh call itself (avoid self-deadlock)
    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === "/auth/access-token"
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return this.client(originalRequest);
        })
        .catch(() => Promise.reject(error));
    }

    // First 401 — start the refresh
    isRefreshing = true;

    try {
      const newToken = await this.refreshToken();

      // Resolve all queued requests with the new token
      processQueue(null, newToken);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return this.client(originalRequest);
    } catch (refreshError) {
      // Reject all queued requests
      processQueue(refreshError, null);

      // Force logout
      clearLocalStorage();
      window.dispatchEvent(new CustomEvent("auth:force-logout"));

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  };

  /* ---------- refresh helper ---------- */

  private async refreshToken(): Promise<string> {
    const { data } = await this.client.get("/auth/access-token");
    const token = data.data?.access_token ?? data.access_token;
    if (!token) throw new Error("No access_token in refresh response");
    setAccessToken(token);
    return token;
  }

  /* ---------- public HTTP methods ---------- */

  async get<T>(
    endpoint: string,
    params?: object,
    options?: { responseType?: "json" | "blob" | "arraybuffer" }
  ): Promise<T> {
    const response = await this.client.get(endpoint, {
      params,
      responseType: options?.responseType ?? "json",
    });
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    let headers = {};
    if (data instanceof FormData) {
      headers = { "Content-Type": "multipart/form-data" };
    }
    const response = await this.client.post(endpoint, data, { headers });
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    let headers = {};
    if (data instanceof FormData) {
      headers = { "Content-Type": "multipart/form-data" };
    }
    const response = await this.client.put(endpoint, data, { headers });
    return response.data;
  }

  async delete<T>(endpoint: string, params?: object): Promise<T> {
    const response = await this.client.delete(endpoint, { params });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
