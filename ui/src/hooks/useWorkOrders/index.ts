import React, { useState } from "react";
import { apiClient } from "@/api/client";

import * as actions from "./actions";
import useOrdersReducer from "./ordersReducer";
import { PaginatedResponse, SuccessResponse } from "@/api/types";
import { Metrics, OrdersData, Workorder, WorkorderData } from "./types";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

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
    async (queryString: string, options?: { silent?: boolean }): Promise<void> => {
      // `silent` evita togglear el estado de carga (para refrescos de fondo sin parpadeo).
      if (!options?.silent) {
        setProcessing(true);
      }
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
            payload: response.data.data ?? [],
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

        setError("Ocurrio un error en la busqueda de ordenes");
      } catch (error) {
        setError(
          extractErrorMessage(error, "Error desconocido en la busqueda de ordenes.")
        );
      } finally {
        if (!options?.silent) {
          setProcessing(false);
        }
      }
    },
    [dispatch]
  );

  const getMetrics = React.useCallback(
    async (queryString: string, options?: { silent?: boolean }) => {
      // `silent` evita togglear el estado de carga (para refrescos de fondo sin parpadeo).
      if (!options?.silent) {
        setProcessingMetrics(true);
      }
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

        setErrorMetrics("Ocurrio un error en la busqueda de kpis");
      } catch (error) {
        setErrorMetrics(
          extractErrorMessage(error, "Error desconocido en la busqueda de metricas.")
        );
      } finally {
        if (!options?.silent) {
          setProcessingMetrics(false);
        }
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

        setErrorCreation("Ocurrio un error en la creación de la orden");
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setErrorCreation("Ya existe una orden con el mismo número.");
          return;
        }

        setErrorCreation(
          extractErrorMessage(error, "Error desconocido en la creación de la orden.")
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

        setErrorCreation("Ocurrio un error en la actualización de la orden");
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setErrorCreation("Ya existe una orden con el mismo número.");
          return;
        }

        setErrorCreation(
          extractErrorMessage(
            error,
            "Error desconocido en la actualización de la orden."
          )
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
        const status = extractErrorStatus(error);

        if (status === 404) {
          setErrorCreation("No se encontro el borrador digital.");
          return;
        }

        if (status === 409) {
          setErrorCreation(
            "El borrador no se puede editar porque ya fue publicado o el número está en conflicto."
          );
          return;
        }

        setErrorCreation(
          extractErrorMessage(
            error,
            "Error desconocido en la actualización del borrador."
          )
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

        setErrorCreation("Ocurrio un error al buscar la orden");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorCreation("No se encontro la orden.");
          return;
        }

        setErrorCreation(
          extractErrorMessage(error, "Error desconocido en la busqueda de la orden.")
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

        setErrorCreation("Ocurrio un error al buscar el borrador digital");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorCreation("No se encontro el borrador digital.");
          return;
        }

        setErrorCreation(
          extractErrorMessage(
            error,
            "Error desconocido en la busqueda del borrador digital."
          )
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

        const message = "Ocurrio un error al publicar el borrador";
        setErrorCreation(message);
        throw new Error(message);

            } catch (error) {
        const status = extractErrorStatus(error);

        if (status === 404) {
          const message = "No se encontro el borrador digital.";
          setErrorCreation(message);
          throw new Error(message);
        }

        if (status === 409) {
          const message = extractErrorMessage(
            error,
            "No se pudo publicar el borrador porque ya fue publicado o el número está en conflicto."
          );
          setErrorCreation(message);
          throw error;
        }

        const message = extractErrorMessage(
          error,
          "Error desconocido al publicar el borrador."
        );
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
        `/work-orders/drafts/${normalizeDraftId(id)}`
      );

      if (response.success) {
        return;
      }

      const message = "Ocurrio un error al intentar eliminar el borrador.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const status = extractErrorStatus(error);

      if (status === 404) {
        const message = "No se encontro el borrador digital.";
        setError(message);
        throw new Error(message);
      }

      const message = extractErrorMessage(
        error,
        "Error desconocido al intentar eliminar el borrador digital."
      );
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
        "/work-orders/" + id
      );

      if (response.success) {
        return;
      }

      const message = "Ocurrio un error al intentar eliminar una orden.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Error desconocido al intentar eliminar una orden."
      );
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
      const response = await apiClient.post<SuccessResponse<string>>(
        `/work-orders/${id}/archive`
      );

      if (response.success) {
        return;
      }

      const message = "Ocurrio un error al intentar archivar una orden.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Error desconocido al intentar archivar una orden."
      );
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
      const response = await apiClient.post<SuccessResponse<string>>(
        `/work-orders/${id}/restore`
      );

      if (response.success) {
        return;
      }

      const message = "Ocurrio un error al intentar restaurar una orden.";
      setError(message);
      throw new Error(message);
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Error desconocido al intentar restaurar una orden."
      );
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const getArchivedOrders = React.useCallback(
    async (queryString: string, options?: { silent?: boolean }): Promise<void> => {
      if (!options?.silent) {
        setProcessing(true);
      }
      setError(null);

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<OrdersListResponse>(
          `/work-orders/archived${queryParams}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_ORDERS,
            payload: response.data.data ?? [],
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

        setError("Ocurrio un error en la busqueda de ordenes archivadas");
      } catch (error) {
        setError(
          extractErrorMessage(
            error,
            "Error desconocido en la busqueda de ordenes archivadas."
          )
        );
      } finally {
        if (!options?.silent) {
          setProcessing(false);
        }
      }
    },
    [dispatch]
  );

  return {
    orders,
    metrics,
    processingMetrics,
    errorMetrics,
    getOrders,
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
    getArchivedOrders,
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
