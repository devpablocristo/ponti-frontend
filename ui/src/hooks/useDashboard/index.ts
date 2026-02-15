import React, { useState } from "react";

import useDashboardReducer from "./useDashboardReducer";
import * as actions from "./actions";
import { DashboardData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

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
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    dashboard,
    processing,
    error,
    getDashboardInfo,
  };
};

export default useDashboard;
