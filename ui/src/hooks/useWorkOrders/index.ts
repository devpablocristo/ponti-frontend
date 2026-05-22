import React, { useState } from "react";
import { apiClient } from "@/api/client";

import * as actions from "./actions";
import useOrdersReducer from "./ordersReducer";
import { PaginatedResponse, SuccessResponse } from "@/api/types";
import { Metrics, OrdersData, Workorder, WorkorderData } from "./types";
import { formatError } from "@/lib/format";

type OrdersListResponse = SuccessResponse<PaginatedResponse<OrdersData>>;
type WorkOrderMutationResponse = SuccessResponse<unknown>;

type PublishDraftResponse = SuccessResponse<{
  draft_id: number;
  published_work_order_id: number;
  status: "published";
}>;

const normalizeDraftId = (id: number) => Math.abs(id);

const useOrders = () => {
  const [
    { orders, pageInfo, resultCreation, selectedOrder, metrics },
    dispatch,
  ] = useOrdersReducer();

  const [processing, setProcessing] = useState(false);
  const [processingCreation, setProcessingCreation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);

  const [processingMetrics, setProcessingMetrics] = useState(false);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [processingDetail, setProcessingDetail] = useState(false);

  const getOrders = React.useCallback(
    async (queryString: string): Promise<void> => {
      setProcessing(true);
      setError(null);

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<OrdersListResponse>(
          `/work-orders${queryParams}`
        );

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
    },
    [dispatch]
  );

  const getMetrics = React.useCallback(
    async (queryString: string) => {
      setProcessingMetrics(true);
      setErrorMetrics(null);

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<Metrics>>(
          "/work-orders/metrics" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_METRICS,
            payload: response.data,
          });
          return;
        }

        setErrorMetrics("No se pudieron cargar los indicadores.");
      } catch (error) {
        setErrorMetrics(formatError(error, { fallback: "No se pudieron cargar los indicadores." }));
      } finally {
        setProcessingMetrics(false);
      }
    },
    [dispatch]
  );

  const saveOrder = React.useCallback(
    async (order: Workorder) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: "",
      });

      try {
        const response = await apiClient.post<WorkOrderMutationResponse>(
          `/work-orders`,
          order
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: "Se ha creado la orden con éxito!",
          });
          return;
        }

        setErrorCreation("No se pudo crear la orden de trabajo.");
      } catch (error) {
        // No discriminamos por status acá: formatError prioriza
        // translateBackendError (que mapea "lot is archived",
        // "work order already exists for ...", etc.) y cae a userMessage
        // del interceptor para errores genéricos de red / 5xx.
        setErrorCreation(
          formatError(error, { fallback: "No se pudo crear la orden de trabajo." }),
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

  const updateOrder = React.useCallback(
    async (id: number, order: Workorder) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: "",
      });

      try {
        const response = await apiClient.put<WorkOrderMutationResponse>(
          `/work-orders/${id}`,
          order
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: "Se ha actualizado la orden con éxito!",
          });
          return;
        }

        setErrorCreation("No se pudo actualizar la orden de trabajo.");
      } catch (error) {
        setErrorCreation(
          formatError(error, { fallback: "No se pudo actualizar la orden de trabajo." }),
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

  const updateDraftOrder = React.useCallback(
    async (id: number, order: Workorder) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: "",
      });

      try {
        await apiClient.put(
          `/work-orders/drafts/${normalizeDraftId(id)}`,
          order
        );

        dispatch({
          type: actions.SET_RESULT_CREATION,
          payload: "Se ha actualizado el borrador con éxito!",
        });
        return;
      } catch (error) {
        setErrorCreation(
          formatError(error, {
            fallback: "No se pudo actualizar el borrador digital. Verificá que siga abierto.",
          }),
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

  const getWorkorder = React.useCallback(
    async (id: number) => {
      setProcessingDetail(true);
      setErrorCreation(null);

      try {
        const response = await apiClient.get<SuccessResponse<WorkorderData>>(
          `/work-orders/${id}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_SELECTED_ORDER,
            payload: response.data,
          });
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
    },
    [dispatch]
  );

  const getDraftWorkorder = React.useCallback(
    async (id: number) => {
      setProcessingDetail(true);
      setErrorCreation(null);

      try {
        const response = await apiClient.get<SuccessResponse<WorkorderData>>(
          `/work-orders/drafts/${normalizeDraftId(id)}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_SELECTED_ORDER,
            payload: response.data,
          });
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
    },
    [dispatch]
  );

  const publishDraftOrder = React.useCallback(
    async (id: number) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: "",
      });

      try {
        const response = await apiClient.post<PublishDraftResponse>(
          `/work-orders/drafts/${normalizeDraftId(id)}/publish`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: "Se ha publicado el borrador con éxito!",
          });
          return response.data;
        }

        const message = "No se pudo publicar el borrador.";
        setErrorCreation(message);
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, {
          fallback: "No se pudo publicar el borrador digital.",
        });
        setErrorCreation(message);
        throw error;
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

    const deleteDraftOrder = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);

    try {
      const response = await apiClient.delete<SuccessResponse<string>>(
        `/work-orders/drafts/${normalizeDraftId(id)}/hard`
      );

      if (response.success) {
        return;
      }

      const message = "No se pudo eliminar el borrador digital.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const message = formatError(error, {
        fallback: "No se pudo eliminar el borrador digital.",
      });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const deleteOrder = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);

    try {
      const response = await apiClient.delete<SuccessResponse<string>>(
        "/work-orders/" + id + "/hard"
      );

      if (response.success) {
        return;
      }

      const message = "No se pudo eliminar la orden de trabajo.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const message = formatError(error, {
        fallback: "No se pudo eliminar la orden de trabajo.",
      });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const archiveOrder = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<WorkOrderMutationResponse>(
        `/work-orders/${id}/archive`,
        {},
      );
      if (!response.success) {
        const message = "No se pudo archivar la orden de trabajo.";
        setError(message);
        throw new Error(message);
      }
    } catch (error) {
      const message = formatError(error, {
        fallback: "No se pudo archivar la orden de trabajo.",
      });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const restoreOrder = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<WorkOrderMutationResponse>(
        `/work-orders/${id}/restore`,
        {},
      );
      if (!response.success) {
        const message = "No se pudo restaurar la orden de trabajo.";
        setError(message);
        throw new Error(message);
      }
    } catch (error) {
      const message = formatError(error, {
        fallback: "No se pudo restaurar la orden de trabajo.",
      });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const hardDeleteOrder = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.delete<WorkOrderMutationResponse>(
        `/work-orders/${id}/hard`,
      );
      if (!response.success) {
        const message = "No se pudo eliminar la orden de trabajo.";
        setError(message);
        throw new Error(message);
      }
    } catch (error) {
      const message = formatError(error, {
        fallback: "No se pudo eliminar la orden de trabajo.",
      });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const getArchivedOrders = React.useCallback(
    async (queryString: string): Promise<void> => {
      setProcessing(true);
      setError(null);
      let queryParams = "";
      if (queryString !== "") queryParams = `?${queryString}`;
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
    },
    [dispatch],
  );

  return {
    orders,
    metrics,
    processingMetrics,
    errorMetrics,
    getOrders,
    getArchivedOrders,
    getMetrics,
    saveOrder,
    updateOrder,
    updateDraftOrder,
    getWorkorder,
    getDraftWorkorder,
    publishDraftOrder,
    deleteDraftOrder,
    deleteOrder,
    archiveOrder,
    restoreOrder,
    hardDeleteOrder,
    selectedOrder,
    resultCreation,
    processing,
    error,
    processingCreation,
    processingDetail,
    errorCreation,
    pageInfo,
  };
};

export default useOrders;
