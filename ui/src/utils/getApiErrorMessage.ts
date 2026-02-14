import { AxiosError } from "axios";

type ApiErrorPayload = {
  error?: {
    status?: number;
    details?: string;
  };
  message?: string;
  error_message?: string;
  details?: string;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return axiosError.response?.data?.error?.status ?? axiosError.response?.status;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const data = axiosError.response?.data as ApiErrorPayload | string | undefined;

  if (typeof data === "string" && data.trim() !== "") {
    return data;
  }

  const message =
    typeof data === "object" && data
      ? data.message || data.error_message || data.details || data.error?.details
      : undefined;

  if (typeof message === "string" && message.trim() !== "") {
    return message;
  }

  return fallback;
};
