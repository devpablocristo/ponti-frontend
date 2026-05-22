import React, { useState } from "react";
import type { AxiosError } from "axios";
import { apiClient } from "@/api/client";
import * as actions from "./actions";
import useOrdersReducer from "./supplyMovementsReducer";
import { SuccessResponse } from "@/api/types";
import { withQuery } from "@/lib/workspaceQuery";
import {
  BatchErrorPayload,
  SupplyMovement,
  SupplyMovementRequest,
  SupplyResponse,
  UpdateSupplyMovementRequest,
} from "./types";
import { extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatError } from "@/lib/format";

type SupplyMovementResult = {
  supply_movement_id: number;
  is_saved: boolean;
  error_detail: string;
};

type SupplyMovementCreationResponse = SuccessResponse<{
  supply_movements: SupplyMovementResult[];
}>;
type SupplyMovementMutationResponse = SuccessResponse<unknown>;

function getBatchErrorData(error: unknown): BatchErrorPayload | undefined {
  const axiosError = error as AxiosError<BatchErrorPayload>;
  return axiosError?.response?.data ?? (error as BatchErrorPayload | undefined);
}

function getBatchErrorMessage(error: unknown): string {
  const data = getBatchErrorData(error);

  if (!data) {
    return "No se pudo importar el movimiento. Verificá los datos del archivo.";
  }

  const failures = data.failures ?? data.error?.context?.failures;
  const supplyMovements =
    data.supply_movements ?? data.error?.context?.supply_movements;

  if (Array.isArray(failures) && failures.length > 0) {
    return failures
      .map((failure) => {
        const row = typeof failure.index === "number" ? failure.index + 2 : "?";
        return `Fila ${row}: ${failure.message ?? "Error de validación"}`;
      })
      .join("\n");
  }

  if (Array.isArray(supplyMovements) && supplyMovements.length > 0) {
    const details = supplyMovements
      .map((movement, index) =>
        movement.error_detail
          ? `Fila ${index + 2}: ${movement.error_detail}`
          : null
      )
      .filter(Boolean);

    if (details.length > 0) {
      return details.join("\n");
    }
  }

  if (
    typeof data.error?.details === "string" &&
    data.error.details.trim() !== ""
  ) {
    return data.error.details;
  }

  if (typeof data.message === "string" && data.message.trim() !== "") {
    return data.message;
  }

  return "No se pudo importar el movimiento. Verificá los datos del archivo.";
}

const useSupplyMovements = () => {
  const [
    {
      supplyMovements,
      summary,
      pageInfo,
      resultCreation,
      selectedSupplyMovement,
    },
    dispatch,
  ] = useOrdersReducer();
  const [processing, setProcessing] = useState(false);
  const [processingCreation, setProcessingCreation] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);
  const [errorCreationPayload, setErrorCreationPayload] =
    useState<BatchErrorPayload | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState(false);

  const getSupplyMovements = React.useCallback(
    async (query: string): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
          withQuery("/supply_movements", query)
        );

        if (response) {
          const summaryPayload = response.data.summary ?? {
            total_kg: 0,
            total_lt: 0,
            total_usd: 0,
          };

          dispatch({
            type: actions.SET_SUMMARY,
            payload: summaryPayload,
          });

          dispatch({
            type: actions.SET_SUPPLY_MOVEMENTS,
            payload: response.data.entries,
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
        setError("No se pudieron cargar los movimientos de insumos.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar los movimientos de insumos." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const getArchivedSupplyMovements = React.useCallback(
    async (projectId?: number | null): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const path =
          projectId && projectId > 0
            ? `/supply_movements/${projectId}/archived`
            : `/supply_movements/archived`;
        const response = await apiClient.get<SuccessResponse<SupplyResponse>>(path);

        if (response) {
          dispatch({
            type: actions.SET_SUMMARY,
            payload: response.data.summary ?? {
              total_kg: 0,
              total_lt: 0,
              total_usd: 0,
            },
          });

          dispatch({
            type: actions.SET_SUPPLY_MOVEMENTS,
            payload: response.data.entries,
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

        setError("No se pudieron cargar los movimientos archivados.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar los movimientos archivados." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const saveSupplyMovement = React.useCallback(
    async (projectId: number, supplyMovement: SupplyMovementRequest) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      setErrorCreationPayload(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: {
          supply_movements: [],
        },
      });

      try {
        const response = await apiClient.post<SupplyMovementCreationResponse>(
          `/supply_movements/${projectId}`,
          supplyMovement
        );

        if (response) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: response.data,
          });
          return;
        }

        setErrorCreation("No se pudo crear el movimiento de insumo.");
      } catch (error) {
        const payload = getBatchErrorData(error) ?? null;
        setErrorCreationPayload(payload);
        setErrorCreation(
          getBatchErrorMessage(error)
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

  const saveImportedSupplyMovement = React.useCallback(
    async (projectId: number, supplyMovement: SupplyMovementRequest) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      setErrorCreationPayload(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: {
          supply_movements: [],
        },
      });

      try {
        const response = await apiClient.post<SupplyMovementCreationResponse>(
          `/supply_movements/${projectId}/import`,
          supplyMovement
        );

        if (response) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: response.data,
          });
          return;
        }

        setErrorCreation("No se pudo importar el movimiento de insumo.");
      } catch (error) {
        const payload = getBatchErrorData(error) ?? null;
        setErrorCreationPayload(payload);
        setErrorCreation(
          getBatchErrorMessage(error)
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    [dispatch]
  );

 const updateSupplyMovement = React.useCallback(
  async (
    supplyMovementId: number,
    projectId: number,
    supplyMovement: UpdateSupplyMovementRequest
  ): Promise<boolean> => {
    setProcessingCreation(true);
    setErrorCreation(null);
    setErrorCreationPayload(null);
    dispatch({
      type: actions.SET_RESULT_CREATION,
      payload: {
        supply_movements: [],
      },
    });

      try {
        const response = await apiClient.put<SupplyMovementCreationResponse>(
          `/supply_movements/${supplyMovementId}/project/${projectId}`,
          supplyMovement
        );

      if (response) {
        dispatch({
          type: actions.SET_RESULT_CREATION,
          payload: response.data,
        });
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
  },
  [dispatch]
);

  const [processingDelete, setProcessingDelete] = useState(false);
  const [processingDetail, setProcessingDetail] = useState(false);

  const deleteSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      setProcessingDelete(true);
      setDeleteError(null);
      setDeleteResult(false);

      try {
        const response = await apiClient.delete<SupplyMovementMutationResponse>(
          `/supply_movements/${id}/project/${projectId}/hard`
        );

        if (response) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("No se pudo eliminar el movimiento.");
      } catch (error) {
        // El 409 acá tiene un copy específico que el BE no provee: el cierre
        // de stock asociado bloquea el delete. Lo mantenemos como caso especial.
        if (extractErrorStatus(error) === 409) {
          setDeleteError(
            "No se puede eliminar el movimiento porque existe un cierre de stock asociado.",
          );
          return;
        }

        setDeleteError(formatError(error, { fallback: "No se pudo eliminar el movimiento." }));
      } finally {
        setProcessingDelete(false);
      }
    },
    []
  );

  const archiveSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      setProcessingDelete(true);
      setDeleteError(null);
      setDeleteResult(false);

      try {
        const response = await apiClient.post<SupplyMovementMutationResponse>(
          `/supply_movements/${id}/project/${projectId}/archive`,
          {}
        );

        if (response) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("No se pudo archivar el movimiento.");
      } catch (error) {
        setDeleteError(formatError(error, { fallback: "No se pudo archivar el movimiento." }));
      } finally {
        setProcessingDelete(false);
      }
    },
    []
  );

  const restoreSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      setProcessingDelete(true);
      setDeleteError(null);
      setDeleteResult(false);

      try {
        const response = await apiClient.post<SupplyMovementMutationResponse>(
          `/supply_movements/${id}/project/${projectId}/restore`,
          {}
        );

        if (response) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("No se pudo restaurar el movimiento.");
      } catch (error) {
        setDeleteError(formatError(error, { fallback: "No se pudo restaurar el movimiento." }));
      } finally {
        setProcessingDelete(false);
      }
    },
    []
  );

  const hardDeleteSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      setProcessingDelete(true);
      setDeleteError(null);
      setDeleteResult(false);

      try {
        const response = await apiClient.delete<SupplyMovementMutationResponse>(
          `/supply_movements/${id}/project/${projectId}/hard`
        );

        if (response) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("No se pudo eliminar el movimiento permanentemente.");
      } catch (error) {
        setDeleteError(formatError(error, { fallback: "No se pudo eliminar el movimiento permanentemente." }));
      } finally {
        setProcessingDelete(false);
      }
    },
    []
  );

  const getSupplyMovement = React.useCallback(async (id: number) => {
    setProcessingDetail(true);
    try {
      const response = await apiClient.get<SuccessResponse<SupplyMovement>>(
        `/supply_movements/${id}`
      );

      if (response) {
        dispatch({
          type: actions.SET_SELECTED_SUPPLY_MOVEMENT,
          payload: response.data,
        });
        return;
      }

      setErrorCreation("No se pudo cargar el movimiento.");
    } catch (error) {
      setErrorCreation(formatError(error, { fallback: "No se pudo cargar el movimiento." }));
    } finally {
      setProcessingDetail(false);
    }
  }, [dispatch]);

  return {
    supplyMovements,
    summary,
    getSupplyMovements,
    getArchivedSupplyMovements,
    deleteSupplyMovement,
    archiveSupplyMovement,
    restoreSupplyMovement,
    hardDeleteSupplyMovement,
    deleteError,
    deleteResult,
    processingDelete,
    saveSupplyMovement,
    saveImportedSupplyMovement,
    updateSupplyMovement,
    getSupplyMovement,
    selectedSupplyMovement,
    resultCreation,
    processing,
    processingDetail,
    error,
    processingCreation,
    errorCreation,
    errorCreationPayload,
    pageInfo,
  };
};

export default useSupplyMovements;
