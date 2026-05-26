import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import { withQuery } from "@/lib/workspaceQuery";

import * as actions from "./actions";
import type { Action } from "./supplyMovementsReducer";
import { SupplyMovement, SupplyResponse } from "./types";

type QueryDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingDetail: (v: boolean) => void;
  setErrorCreation: (v: string | null) => void;
};

/**
 * Factory de read queries para supply movements (lista paginada + summary,
 * archivados, detail por id). El summary viene en mismo response que la
 * lista — no hay endpoint metrics separado.
 */
export function createSupplyMovementQueries(deps: QueryDeps) {
  const { dispatch, setProcessing, setError, setProcessingDetail, setErrorCreation } = deps;

  const setSummaryFrom = (data: SupplyResponse) => {
    dispatch({
      type: actions.SET_SUMMARY,
      payload: data.summary ?? { total_kg: 0, total_lt: 0, total_usd: 0 },
    });
    dispatch({ type: actions.SET_SUPPLY_MOVEMENTS, payload: data.entries });
    dispatch({
      type: actions.SET_PAGE_INFO,
      payload: {
        page: data.page_info.page,
        per_page: data.page_info.per_page,
        total: data.page_info.total,
        max_page: data.page_info.max_page,
      },
    });
  };

  const getSupplyMovements = async (query: string): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
        withQuery("/supply_movements", query),
      );
      if (response) {
        setSummaryFrom(response.data);
        return;
      }
      setError("No se pudieron cargar los movimientos de insumos.");
    } catch (error) {
      setError(
        formatError(error, { fallback: "No se pudieron cargar los movimientos de insumos." }),
      );
    } finally {
      setProcessing(false);
    }
  };

  const getArchivedSupplyMovements = async (projectId?: number | null): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const path =
        projectId && projectId > 0
          ? `/supply_movements/${projectId}/archived`
          : `/supply_movements/archived`;
      const response = await apiClient.get<SuccessResponse<SupplyResponse>>(path);
      if (response) {
        setSummaryFrom(response.data);
        return;
      }
      setError("No se pudieron cargar los movimientos archivados.");
    } catch (error) {
      setError(
        formatError(error, { fallback: "No se pudieron cargar los movimientos archivados." }),
      );
    } finally {
      setProcessing(false);
    }
  };

  const getSupplyMovement = async (id: number) => {
    setProcessingDetail(true);
    try {
      const response = await apiClient.get<SuccessResponse<SupplyMovement>>(
        `/supply_movements/${id}`,
      );
      if (response) {
        dispatch({ type: actions.SET_SELECTED_SUPPLY_MOVEMENT, payload: response.data });
        return;
      }
      setErrorCreation("No se pudo cargar el movimiento.");
    } catch (error) {
      setErrorCreation(formatError(error, { fallback: "No se pudo cargar el movimiento." }));
    } finally {
      setProcessingDetail(false);
    }
  };

  return { getSupplyMovements, getArchivedSupplyMovements, getSupplyMovement };
}
