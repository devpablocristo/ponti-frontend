import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./ordersReducer";
import { Metrics } from "./types";

type MetricsDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessingMetrics: (v: boolean) => void;
  setErrorMetrics: (v: string | null) => void;
};

/**
 * Factory de metrics-only para work orders. Aislado de queries/mutations
 * porque tiene su propio par processing/error y vive en otro endpoint.
 */
export function createWorkOrderMetricsService(deps: MetricsDeps) {
  const { dispatch, setProcessingMetrics, setErrorMetrics } = deps;

  const getMetrics = async (queryString: string) => {
    setProcessingMetrics(true);
    setErrorMetrics(null);
    const queryParams = queryString ? `?${queryString}` : "";

    try {
      const response = await apiClient.get<SuccessResponse<Metrics>>(
        "/work-orders/metrics" + queryParams,
      );
      if (response.success) {
        dispatch({ type: actions.SET_METRICS, payload: response.data });
        return;
      }
      setErrorMetrics("No se pudieron cargar los indicadores.");
    } catch (error) {
      setErrorMetrics(
        formatError(error, { fallback: "No se pudieron cargar los indicadores." }),
      );
    } finally {
      setProcessingMetrics(false);
    }
  };

  return { getMetrics };
}
