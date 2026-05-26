import { apiClient } from "@/api/client";
import { PaginatedResponse, SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./ordersReducer";
import { OrdersData, WorkorderData } from "./types";

type OrdersListResponse = SuccessResponse<PaginatedResponse<OrdersData>>;

const normalizeDraftId = (id: number) => Math.abs(id);

type QueryDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingDetail: (v: boolean) => void;
  setErrorCreation: (v: string | null) => void;
};

/**
 * Factory de queries (read-only) para work orders.
 * Recibe los setters/dispatch del hook y retorna las funciones async.
 * Separado de mutations.ts para mantener responsabilidades chicas.
 */
export function createWorkOrderQueries(deps: QueryDeps) {
  const { dispatch, setProcessing, setError, setProcessingDetail, setErrorCreation } = deps;

  const getOrders = async (queryString: string): Promise<void> => {
    setProcessing(true);
    setError(null);
    const queryParams = queryString ? `?${queryString}` : "";

    try {
      const response = await apiClient.get<OrdersListResponse>(`/work-orders${queryParams}`);
      if (response.success) {
        dispatch({
          type: actions.SET_ORDERS,
          payload: response.data.data ?? response.data.items ?? [],
        });
        dispatch({
          type: actions.SET_PAGE_INFO,
          payload: {
            page: response.data.page_info.page,
            per_page: response.data.page_info.per_page,
            total: response.data.page_info.total,
            max_page: response.data.page_info.max_page,
          },
        });
        return;
      }
      setError("No se pudieron cargar las órdenes de trabajo.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar las órdenes de trabajo." }));
    } finally {
      setProcessing(false);
    }
  };

  const getArchivedOrders = async (queryString: string): Promise<void> => {
    setProcessing(true);
    setError(null);
    const queryParams = queryString ? `?${queryString}` : "";
    try {
      const response = await apiClient.get<OrdersListResponse>(
        `/work-orders/archived${queryParams}`,
      );
      if (response.success) {
        dispatch({ type: actions.SET_ORDERS, payload: response.data.data ?? [] });
        if (response.data.page_info) {
          dispatch({ type: actions.SET_PAGE_INFO, payload: response.data.page_info });
        }
        return;
      }
      setError("No se pudieron cargar las órdenes archivadas.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar las órdenes archivadas." }));
    } finally {
      setProcessing(false);
    }
  };

  const getWorkorder = async (id: number) => {
    setProcessingDetail(true);
    setErrorCreation(null);
    try {
      const response = await apiClient.get<SuccessResponse<WorkorderData>>(`/work-orders/${id}`);
      if (response.success) {
        dispatch({ type: actions.SET_SELECTED_ORDER, payload: response.data });
        return;
      }
      setErrorCreation("No se pudo cargar la orden de trabajo.");
    } catch (error) {
      setErrorCreation(
        formatError(error, { fallback: "No se pudo cargar la orden de trabajo." }),
      );
    } finally {
      setProcessingDetail(false);
    }
  };

  const getDraftWorkorder = async (id: number) => {
    setProcessingDetail(true);
    setErrorCreation(null);
    try {
      const response = await apiClient.get<SuccessResponse<WorkorderData>>(
        `/work-orders/drafts/${normalizeDraftId(id)}`,
      );
      if (response.success) {
        dispatch({ type: actions.SET_SELECTED_ORDER, payload: response.data });
        return;
      }
      setErrorCreation("No se pudo cargar el borrador digital.");
    } catch (error) {
      setErrorCreation(
        formatError(error, { fallback: "No se pudo cargar el borrador digital." }),
      );
    } finally {
      setProcessingDetail(false);
    }
  };

  return { getOrders, getArchivedOrders, getWorkorder, getDraftWorkorder };
}
