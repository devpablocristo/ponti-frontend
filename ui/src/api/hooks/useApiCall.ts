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
      ? data.error?.details || data.details || data.message || data.error_message
      : undefined;

  if (typeof message === "string" && message.trim() !== "") return message;

  return fallback;
}

function extractErrorStatus(error: unknown): number | undefined {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return axiosError?.response?.data?.error?.status ?? axiosError?.response?.status;
}

export { extractErrorMessage, extractErrorStatus };
