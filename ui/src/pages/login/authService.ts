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

        if (errorResponse.error) {
          const status = errorResponse.error.status;
          const message =
            errorResponse.error.details || "Error desconocido en el login.";
          throw new RequestError(status, message);
        }
      }

      throw new RequestError(500, "Error en el servicio, inténtalo más tarde.");
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    const logoutData: LogoutData = {
      refresh_token: refreshToken,
    };

    try {
      await apiClient.post<any>("/auth/logout", logoutData);
      return;
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.status,
        "Ocurrió un error en la busqueda de datos, por favor intente mas tarde."
      );
    }
  }

  static async refreshToken(): Promise<TokenResponse> {
    try {
      const response = await apiClient.get<SuccessResponse<TokenResponse>>(
        "/auth/access-token"
      );

      if (!response.data.access_token || !response.data.refresh_token) {
        throw new Error("No se recibió un nuevo access token.");
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.status,
        "Error al refrescar el token, por favor intente más tarde."
      );
    }
  }

  static async validateToken(): Promise<void> {
    try {
      await apiClient.get("/auth/session");
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new RequestError(
        axiosError.status,
        "Ocurrió un error en la busqueda de datos, por favor intente mas tarde."
      );
    }
  }
}
