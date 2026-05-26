import { apiClient } from "@/api/client";
import { extractErrorStatus } from "@/api/hooks/useApiCall";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import { getBatchErrorData, getBatchErrorMessage } from "./batchErrors";
import type { Action } from "./supplyMovementsReducer";
import {
  BatchErrorPayload,
  SupplyMovementRequest,
  UpdateSupplyMovementRequest,
} from "./types";

type SupplyMovementResult = {
  supply_movement_id: number;
  is_saved: boolean;
  error_detail: string;
};

type SupplyMovementCreationResponse = SuccessResponse<{
  supply_movements: SupplyMovementResult[];
}>;

type SupplyMovementMutationResponse = SuccessResponse<unknown>;

type MutationDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessingCreation: (v: boolean) => void;
  setErrorCreation: (v: string | null) => void;
  setErrorCreationPayload: (v: BatchErrorPayload | null) => void;
  setProcessingDelete: (v: boolean) => void;
  setDeleteError: (v: string | null) => void;
  setDeleteResult: (v: boolean) => void;
};

/**
 * Factory de mutations para supply movements. Cubre 3 sub-flujos:
 *   1. Create/import/update (batch) — usan processingCreation/errorCreation,
 *      con payload batch para mostrar errores por fila.
 *   2. Destructivas (delete/archive/restore/hardDelete) — usan
 *      processingDelete/deleteError/deleteResult.
 *   3. delete tiene caso especial 409 (stock asociado) con copy custom no
 *      cubierto por translateBackendError.
 */
export function createSupplyMovementMutations(deps: MutationDeps) {
  const {
    dispatch,
    setProcessingCreation,
    setErrorCreation,
    setErrorCreationPayload,
    setProcessingDelete,
    setDeleteError,
    setDeleteResult,
  } = deps;

  const resetCreationState = () => {
    setErrorCreation(null);
    setErrorCreationPayload(null);
    dispatch({
      type: actions.SET_RESULT_CREATION,
      payload: { supply_movements: [] },
    });
  };

  const batchCall = async (
    url: string,
    body: unknown,
    notSuccessMessage: string,
  ): Promise<void> => {
    setProcessingCreation(true);
    resetCreationState();
    try {
      const response = await apiClient.post<SupplyMovementCreationResponse>(url, body);
      if (response) {
        dispatch({ type: actions.SET_RESULT_CREATION, payload: response.data });
        return;
      }
      setErrorCreation(notSuccessMessage);
    } catch (error) {
      setErrorCreationPayload(getBatchErrorData(error) ?? null);
      setErrorCreation(getBatchErrorMessage(error));
    } finally {
      setProcessingCreation(false);
    }
  };

  const saveSupplyMovement = (projectId: number, supplyMovement: SupplyMovementRequest) =>
    batchCall(
      `/supply_movements/${projectId}`,
      supplyMovement,
      "No se pudo crear el movimiento de insumo.",
    );

  const saveImportedSupplyMovement = (
    projectId: number,
    supplyMovement: SupplyMovementRequest,
  ) =>
    batchCall(
      `/supply_movements/${projectId}/import`,
      supplyMovement,
      "No se pudo importar el movimiento de insumo.",
    );

  const updateSupplyMovement = async (
    supplyMovementId: number,
    projectId: number,
    supplyMovement: UpdateSupplyMovementRequest,
  ): Promise<boolean> => {
    setProcessingCreation(true);
    resetCreationState();
    try {
      const response = await apiClient.put<SupplyMovementCreationResponse>(
        `/supply_movements/${supplyMovementId}/project/${projectId}`,
        supplyMovement,
      );
      if (response) {
        dispatch({ type: actions.SET_RESULT_CREATION, payload: response.data });
        return true;
      }
      setErrorCreation("No se pudo actualizar el movimiento.");
      return false;
    } catch (error) {
      setErrorCreation(formatError(error, { fallback: "No se pudo actualizar el movimiento." }));
      return false;
    } finally {
      setProcessingCreation(false);
    }
  };

  // Destructivas: usan processingDelete/deleteError/deleteResult.
  const destructiveCall = async (
    method: "post" | "delete",
    url: string,
    fallbackMessage: string,
    handle409?: (err: unknown) => boolean,
  ) => {
    setProcessingDelete(true);
    setDeleteError(null);
    setDeleteResult(false);
    try {
      const response =
        method === "post"
          ? await apiClient.post<SupplyMovementMutationResponse>(url, {})
          : await apiClient.delete<SupplyMovementMutationResponse>(url);
      if (response) {
        setDeleteResult(true);
        return;
      }
      setDeleteError(fallbackMessage);
    } catch (error) {
      if (handle409 && extractErrorStatus(error) === 409 && handle409(error)) {
        return;
      }
      setDeleteError(formatError(error, { fallback: fallbackMessage }));
    } finally {
      setProcessingDelete(false);
    }
  };

  const deleteSupplyMovement = (id: number, projectId: number) =>
    destructiveCall(
      "delete",
      `/supply_movements/${id}/project/${projectId}/hard`,
      "No se pudo eliminar el movimiento.",
      () => {
        // 409 acá significa "stock asociado bloquea el delete" — copy custom.
        setDeleteError(
          "No se puede eliminar el movimiento porque existe un cierre de stock asociado.",
        );
        return true;
      },
    );

  const archiveSupplyMovement = (id: number, projectId: number) =>
    destructiveCall(
      "post",
      `/supply_movements/${id}/project/${projectId}/archive`,
      "No se pudo archivar el movimiento.",
    );

  const restoreSupplyMovement = (id: number, projectId: number) =>
    destructiveCall(
      "post",
      `/supply_movements/${id}/project/${projectId}/restore`,
      "No se pudo restaurar el movimiento.",
    );

  const hardDeleteSupplyMovement = (id: number, projectId: number) =>
    destructiveCall(
      "delete",
      `/supply_movements/${id}/project/${projectId}/hard`,
      "No se pudo eliminar el movimiento permanentemente.",
    );

  return {
    saveSupplyMovement,
    saveImportedSupplyMovement,
    updateSupplyMovement,
    deleteSupplyMovement,
    archiveSupplyMovement,
    restoreSupplyMovement,
    hardDeleteSupplyMovement,
  };
}
