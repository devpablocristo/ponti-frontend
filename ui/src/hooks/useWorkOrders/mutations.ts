import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./ordersReducer";
import { Workorder } from "./types";

type WorkOrderMutationResponse = SuccessResponse<unknown>;

type PublishDraftResponse = SuccessResponse<{
  draft_id: number;
  published_work_order_id: number;
  status: "published";
}>;

const normalizeDraftId = (id: number) => Math.abs(id);

type MutationDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingCreation: (v: boolean) => void;
  setErrorCreation: (v: string | null) => void;
};

/**
 * Factory de mutations (create/update/archive/restore/delete) para work orders.
 * Separado de queries.ts: las queries setean `processing`, las mutations
 * setean `processingCreation` con result message para feedback en el form.
 */
export function createWorkOrderMutations(deps: MutationDeps) {
  const {
    dispatch,
    setProcessing,
    setError,
    setProcessingCreation,
    setErrorCreation,
  } = deps;

  const resetCreationResult = () => {
    dispatch({ type: actions.SET_RESULT_CREATION, payload: "" });
  };
  const setCreationResult = (msg: string) => {
    dispatch({ type: actions.SET_RESULT_CREATION, payload: msg });
  };

  const saveOrder = async (order: Workorder) => {
    setProcessingCreation(true);
    setErrorCreation(null);
    resetCreationResult();
    try {
      const response = await apiClient.post<WorkOrderMutationResponse>(`/work-orders`, order);
      if (response.success) {
        setCreationResult("Se ha creado la orden con éxito!");
        return;
      }
      setErrorCreation("No se pudo crear la orden de trabajo.");
    } catch (error) {
      // No discriminamos por status: formatError prioriza
      // translateBackendError (que mapea "lot is archived",
      // "work order already exists for ...", etc.) y cae a userMessage
      // del interceptor para errores genéricos de red / 5xx.
      setErrorCreation(formatError(error, { fallback: "No se pudo crear la orden de trabajo." }));
    } finally {
      setProcessingCreation(false);
    }
  };

  const updateOrder = async (id: number, order: Workorder) => {
    setProcessingCreation(true);
    setErrorCreation(null);
    resetCreationResult();
    try {
      const response = await apiClient.put<WorkOrderMutationResponse>(
        `/work-orders/${id}`,
        order,
      );
      if (response.success) {
        setCreationResult("Se ha actualizado la orden con éxito!");
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
  };

  const updateDraftOrder = async (id: number, order: Workorder) => {
    setProcessingCreation(true);
    setErrorCreation(null);
    resetCreationResult();
    try {
      await apiClient.put(`/work-orders/drafts/${normalizeDraftId(id)}`, order);
      setCreationResult("Se ha actualizado el borrador con éxito!");
    } catch (error) {
      setErrorCreation(
        formatError(error, {
          fallback: "No se pudo actualizar el borrador digital. Verificá que siga abierto.",
        }),
      );
    } finally {
      setProcessingCreation(false);
    }
  };

  const publishDraftOrder = async (id: number) => {
    setProcessingCreation(true);
    setErrorCreation(null);
    resetCreationResult();
    try {
      const response = await apiClient.post<PublishDraftResponse>(
        `/work-orders/drafts/${normalizeDraftId(id)}/publish`,
      );
      if (response.success) {
        setCreationResult("Se ha publicado el borrador con éxito!");
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
  };

  // deleteDraftOrder / deleteOrder usan `processing` (no creation) porque se
  // disparan desde lista, no desde un drawer de edición.
  const hardDelete = async (
    url: string,
    fallbackMessage: string,
  ): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.delete<SuccessResponse<string>>(url);
      if (response.success) return;
      setError(fallbackMessage);
      throw new Error(fallbackMessage);
    } catch (error) {
      const message = formatError(error, { fallback: fallbackMessage });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  };

  const deleteDraftOrder = (id: number) =>
    hardDelete(
      `/work-orders/drafts/${normalizeDraftId(id)}/hard`,
      "No se pudo eliminar el borrador digital.",
    );

  const deleteOrder = (id: number) =>
    hardDelete(`/work-orders/${id}/hard`, "No se pudo eliminar la orden de trabajo.");

  const lifecycleAction = async (
    url: string,
    fallbackMessage: string,
  ): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<WorkOrderMutationResponse>(url, {});
      if (!response.success) {
        setError(fallbackMessage);
        throw new Error(fallbackMessage);
      }
    } catch (error) {
      const message = formatError(error, { fallback: fallbackMessage });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  };

  const archiveOrder = (id: number) =>
    lifecycleAction(`/work-orders/${id}/archive`, "No se pudo archivar la orden de trabajo.");

  const restoreOrder = (id: number) =>
    lifecycleAction(`/work-orders/${id}/restore`, "No se pudo restaurar la orden de trabajo.");

  const hardDeleteOrder = (id: number) =>
    hardDelete(`/work-orders/${id}/hard`, "No se pudo eliminar la orden de trabajo.");

  return {
    saveOrder,
    updateOrder,
    updateDraftOrder,
    publishDraftOrder,
    deleteDraftOrder,
    deleteOrder,
    archiveOrder,
    restoreOrder,
    hardDeleteOrder,
  };
}
