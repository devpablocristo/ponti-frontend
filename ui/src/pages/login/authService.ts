import { AxiosError } from "axios";
import { jwtDecode } from "jwt-decode";

import { apiClient } from "@/api/client";
import { DecodedToken, LogoutData, TokenResponse, UserData } from "./types";
import {
  ErrorResponse,
  RequestError,
  SuccessResponse,
} from "@/api/types";

export class AuthService {
  static async login(
    userData: UserData
  ): Promise<{ token: TokenResponse; user: DecodedToken }> {
    try {
      const response = await apiClient.post<SuccessResponse<TokenResponse>>(
        "/auth/login",
        userData
      );

      if (
        response.success &&
        response.data?.access_token &&
        response.data?.refresh_token
      ) {
        const decoded = jwtDecode<DecodedToken>(response.data.access_token);
        return { token: response.data, user: decoded };
      }

      throw new Error("Respuesta inválida del servidor");
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const errorResponse = axiosError.response.data as ErrorResponse;
        const status = errorResponse?.error?.status ?? axiosError.response.status;
        // En login no traducimos vía formatError: el BE devuelve mensajes
        // específicos (credenciales inválidas, usuario bloqueado) que el
        // usuario necesita ver tal cual. Si no hay details, fallback claro.
        const message =
          errorResponse?.error?.details ||
          "No se pudo iniciar sesión. Verificá tus credenciales.";
        throw new RequestError(status, message);
      }

      throw new RequestError(
        500,
        "No se pudo conectar con el servidor. Verificá tu conexión a internet.",
      );
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    const logoutData: LogoutData = {
      refresh_token: refreshToken,
    };

    try {
      await apiClient.post<SuccessResponse<unknown>>("/auth/logout", logoutData);
      return;
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.response?.status,
        "No se pudo cerrar sesión. Intentá nuevamente.",
      );
    }
  }

  static async refreshToken(): Promise<TokenResponse> {
    try {
      const response = await apiClient.get<SuccessResponse<TokenResponse>>(
        "/auth/access-token"
      );

      const token = response.data;

      if (!token?.access_token || !token?.refresh_token) {
        throw new Error("No se recibió un nuevo access token.");
      }

      return token;
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.response?.status,
        "Tu sesión expiró. Iniciá sesión nuevamente.",
      );
    }
  }

  static async validateToken(): Promise<void> {
    try {
      await apiClient.get("/auth/session");
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.response?.status,
        "Tu sesión expiró. Iniciá sesión nuevamente.",
      );
    }
  }
}
