import React, { useState } from "react";

import useDashboardReducer from "./useDashboardReducer";
import * as actions from "./actions";
import { DashboardData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";
import { clearLocalStorage } from "@/pages/login/context/useLocalStorage";

const useDashboard = () => {
  const [{ dashboard }, dispatch] = useDashboardReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDashboardInfo = React.useCallback(async (queryString: string) => {
    setProcessing(true);
    setError(null);
    let queryParams = "";
    if (queryString !== "") {
      queryParams = `?${queryString}`;
    }

    try {
      const response = await apiClient.get<SuccessResponse<DashboardData>>(
        `/dashboard` + queryParams
      );

      if (response.success) {
        dispatch({
          type: actions.SET_DASHBOARD,
          payload: response.data,
        });
        return;
      }

      setError("Ocurrió un error en la búsqueda del dashboard");
    } catch (error) {
      dispatch({
        type: actions.SET_DASHBOARD,
        payload: null,
      });

      // If the error is auth-related (token invalid/expired), force re-login
      // instead of leaving the dashboard in a broken state.
      const status = extractErrorStatus(error);
      const message = extractErrorMessage(error, "Error en el servicio, inténtalo más tarde.");
      const msgLower = message.toLowerCase();
      if (
        (status === 401 || status === 403) &&
        (msgLower.includes("invalid token") ||
          msgLower.includes("sesión inválida") ||
          msgLower.includes("sesion invalida") ||
          msgLower.includes("jwt") ||
          msgLower.includes("expired"))
      ) {
        clearLocalStorage();
        window.dispatchEvent(new CustomEvent("auth:force-logout"));
        return;
      }

      setError(message);
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  return {
    dashboard,
    processing,
    error,
    getDashboardInfo,
  };
};

export default useDashboard;
