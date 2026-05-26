import React, { useState } from "react";

import dashboardReducer from "./dashboardReducer";
import * as actions from "./actions";
import { DashboardData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";

const useDashboard = () => {
  const [{ dashboard }, dispatch] = dashboardReducer();
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
      // Detección de token inválido + dispatch de `auth:force-logout` ahora
      // vive centralizado en `api/client.ts` interceptor — el AuthProvider
      // recibe el evento y limpia storage + redirige. Acá nos quedamos solo
      // con la copia humana del error para el toast / banner.
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
