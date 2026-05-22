import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./lotsReducer";
import { Crop, LotKPIs, Payload } from "./types";

type QueryDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingKpis: (v: boolean) => void;
  setErrorKpis: (v: string | null) => void;
};

export function createLotQueries(deps: QueryDeps) {
  const { dispatch, setProcessing, setError, setProcessingKpis, setErrorKpis } = deps;

  const fetchLotList = async (url: string, fallbackMessage: string) => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.get<SuccessResponse<Payload>>(url);
      if (response.success) {
        dispatch({ type: actions.SET_LOTS, payload: response.data.data });
        dispatch({ type: actions.SET_PAGE_INFO, payload: response.data.page_info });
        return;
      }
      setError(fallbackMessage);
    } catch (err) {
      setError(formatError(err, { fallback: fallbackMessage }));
    } finally {
      setProcessing(false);
    }
  };

  const getLots = (queryString: string) =>
    fetchLotList(
      `/lots${queryString ? `?${queryString}` : ""}`,
      "No se pudieron cargar los lotes.",
    );

  const getArchivedLots = (queryString: string) =>
    fetchLotList(
      `/lots/archived${queryString ? `?${queryString}` : ""}`,
      "No se pudieron cargar los lotes archivados.",
    );

  const getCrops = async () => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.get<SuccessResponse<Crop[]>>("/crops");
      if (response.success) {
        dispatch({ type: actions.SET_CROPS, payload: response.data });
        return;
      }
      setError("No se pudieron cargar los cultivos.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar los cultivos." }));
    } finally {
      setProcessing(false);
    }
  };

  const getLotsKpis = async (queryString: string) => {
    setProcessingKpis(true);
    setErrorKpis(null);
    try {
      const response = await apiClient.get<SuccessResponse<LotKPIs>>(
        `/lots/metrics${queryString ? `?${queryString}` : ""}`,
      );
      if (response.success) {
        dispatch({ type: actions.SET_KPIS, payload: response.data });
        return;
      }
      setErrorKpis("No se pudieron cargar los indicadores de lotes.");
    } catch (error) {
      setErrorKpis(
        formatError(error, {
          fallback: "No se pudieron cargar los indicadores de lotes.",
        }),
      );
    } finally {
      setProcessingKpis(false);
    }
  };

  return { getLots, getArchivedLots, getCrops, getLotsKpis };
}
