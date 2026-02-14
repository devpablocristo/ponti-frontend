import { useState, useCallback, useRef, useEffect } from "react";
import { AxiosError } from "axios";

interface ApiErrorPayload {
  error?: {
    status?: number;
    details?: string;
  };
  message?: string;
  error_message?: string;
  details?: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const data = axiosError?.response?.data as ApiErrorPayload | string | undefined;

  if (typeof data === "string" && data.trim() !== "") return data;

  const message =
    typeof data === "object" && data
      ? data.message || data.error_message || data.details || data.error?.details
      : undefined;

  if (typeof message === "string" && message.trim() !== "") return message;

  return fallback;
}

function extractErrorStatus(error: unknown): number | undefined {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return axiosError?.response?.data?.error?.status ?? axiosError?.response?.status;
}

interface UseApiCallOptions {
  /** Error message fallback if none found in response */
  errorFallback?: string;
}

interface UseApiCallResult<T, Args extends unknown[]> {
  data: T | null;
  error: string | null;
  errorStatus: number | undefined;
  loading: boolean;
  execute: (...args: Args) => Promise<T | undefined>;
  reset: () => void;
}

export function useApiCall<T, Args extends unknown[] = unknown[]>(
  apiFn: (...args: Args) => Promise<T>,
  options?: UseApiCallOptions
): UseApiCallResult<T, Args> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      setErrorStatus(undefined);

      try {
        const result = await apiFn(...args);
        if (mountedRef.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          const message = extractErrorMessage(
            err,
            options?.errorFallback ?? "Error desconocido"
          );
          setError(message);
          setErrorStatus(extractErrorStatus(err));
        }
        return undefined;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFn, options?.errorFallback]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setErrorStatus(undefined);
    setLoading(false);
  }, []);

  return { data, error, errorStatus, loading, execute, reset };
}

export { extractErrorMessage, extractErrorStatus };
