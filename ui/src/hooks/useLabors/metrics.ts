import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import { withQuery } from "@/lib/workspaceQuery";

import * as actions from "./actions";
import type { Action } from "./laborsReducer";
import { Metrics } from "./types";

type MetricsDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessingMetrics: (v: boolean) => void;
  setErrorMetrics: (v: string | null) => void;
};

export function createLaborMetricsService(deps: MetricsDeps) {
  const { dispatch, setProcessingMetrics, setErrorMetrics } = deps;

  const normalizeMetricsQuery = (queryOrProjectId: string | number, queryString = "") => {
    if (typeof queryOrProjectId !== "number") return queryOrProjectId;

    const params = new URLSearchParams(queryString.replace(/^\?/, ""));
    params.set("project_id", String(queryOrProjectId));
    return params.toString();
  };

  const getMetrics = async (queryOrProjectId: string | number, legacyQuery = "") => {
    const queryString = normalizeMetricsQuery(queryOrProjectId, legacyQuery);
    setProcessingMetrics(true);
    setErrorMetrics(null);
    try {
      const response = await apiClient.get<SuccessResponse<Metrics>>(
        withQuery("/labors/metrics", queryString),
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
