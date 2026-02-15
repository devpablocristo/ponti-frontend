import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { API_TIMEOUT } from "../configService";

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
    // Preservar la estructura de error del BE (type, code, message, details, context)
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

  public async get<T>(
    url: string,
    //headers?: Record<string, string | undefined>
    options?: Record<string, string | undefined> | AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      //const config: AxiosRequestConfig = headers ? { headers } : {};
      let config: AxiosRequestConfig = {};

      if (options) {
        if ("headers" in options || "responseType" in options) {
          config = options as AxiosRequestConfig;
        } else {
          config = { headers: options as Record<string, string | undefined> };
        }
      }

      const response = await this.axiosInstance.get<T>(url, config);
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
      const response = await this.axiosInstance.delete<T>(url, config);
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
      const response = await this.axiosInstance.post<T>(url, data, config);
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
      const response = await this.axiosInstance.put<T>(url, data, config);
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
