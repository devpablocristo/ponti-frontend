import React, { useState } from "react";

import useDashboardReducer from "./useDashboardReducer";
import * as actions from "./actions";
import { DashboardData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatError } from "@/lib/format";
import { clearLocalStorage } from "@/lib/authStorage";

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

      setError("No se pudo cargar el dashboard.");
    } catch (error) {
      dispatch({
        type: actions.SET_DASHBOARD,
        payload: null,
      });

      // Si el error es por sesión inválida o token vencido, forzamos re-login
      // en vez de dejar el dashboard en estado roto. El raw del BE acá nos
      // sirve como heurística para detectar tokens; los demás casos van por
      // formatError que ya prioriza el userMessage del interceptor.
      const status = extractErrorStatus(error);
      const rawMessage = extractErrorMessage(error, "");
      const msgLower = rawMessage.toLowerCase();
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

      setError(formatError(error, { fallback: "No se pudo cargar el dashboard." }));
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
