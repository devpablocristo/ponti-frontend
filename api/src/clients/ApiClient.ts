import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { API_TIMEOUT } from "../configService";
import { requestContext } from "../requestContext";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: ErrorResponse;
}

interface ErrorResponse {
  status: number;
  type?: string;
  code?: number;
  message?: string;
  details: string;
  context?: Record<string, any>;
}

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string, timeout = API_TIMEOUT) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout,
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleErrorResponse
    );
  }

  private handleErrorResponse(error: AxiosError): Promise<ApiResponse<null>> {
    const data = error.response?.data as {
      type?: string;
      code?: number;
      message?: string;
      details?: string;
      context?: Record<string, any>;
      error?: { details?: string };
      error_message?: string;
    };

    const details =
      data?.details ||
      data?.error?.details ||
      data?.message ||
      data?.error_message ||
      "Detalles no disponibles";

    return Promise.reject<ApiResponse<null>>({
      success: false,
      message: data?.message || "Error en la solicitud",
      error: {
        status: error.response?.status ?? 500,
        type: data?.type,
        code: data?.code,
        message: data?.message,
        details,
        context: data?.context,
      },
    });
  }

  private withForwardedAuth(
    config: AxiosRequestConfig = {}
  ): AxiosRequestConfig {
    const auth = requestContext.getAuthorization();
    if (!auth) {
      return config;
    }
    return {
      ...config,
      headers: {
        ...(config.headers || {}),
        Authorization:
          (config.headers as Record<string, string | undefined>)?.Authorization ||
          auth,
      },
    };
  }

  public async get<T>(
    url: string,
    options?: Record<string, string | undefined> | AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      let config: AxiosRequestConfig = {};

      if (options) {
        if ("headers" in options || "responseType" in options) {
          config = options as AxiosRequestConfig;
        } else {
          config = { headers: options as Record<string, string | undefined> };
        }
      }

      const response = await this.axiosInstance.get<T>(
        url,
        this.withForwardedAuth(config)
      );
      return {
        success: true,
        message: "Operación exitosa",
        data: response.data,
      };
    } catch (error) {
      throw error as ApiResponse<null>;
    }
  }

  public async delete<T>(
    url: string,
    headers?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = headers ? { headers } : {};
      const response = await this.axiosInstance.delete<T>(
        url,
        this.withForwardedAuth(config)
      );
      return {
        success: true,
        message: "Operación exitosa",
        data: response.data,
      };
    } catch (error) {
      throw error as ApiResponse<null>;
    }
  }

  public async post<T>(
    url: string,
    data: any,
    headers?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = headers ? { headers } : {};
      const response = await this.axiosInstance.post<T>(
        url,
        data,
        this.withForwardedAuth(config)
      );
      return {
        success: true,
        message: "Operación exitosa",
        data: response.data,
      };
    } catch (error) {
      throw error as ApiResponse<null>;
    }
  }

  public async put<T>(
    url: string,
    data: any,
    headers?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = headers ? { headers } : {};
      const response = await this.axiosInstance.put<T>(
        url,
        data,
        this.withForwardedAuth(config)
      );
      return {
        success: true,
        message: "Operación exitosa",
        data: response.data,
      };
    } catch (error) {
      throw error as ApiResponse<null>;
    }
  }
}
