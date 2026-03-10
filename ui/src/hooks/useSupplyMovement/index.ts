import React, { useState } from "react";
import type { AxiosError } from "axios";
import { apiClient } from "@/api/client";
import * as actions from "./actions";
import useOrdersReducer from "./ordersReducer";
import { SuccessResponse } from "@/api/types";
import {
  BatchErrorPayload,
  SupplyMovement,
  SupplyMovementRequest,
  SupplyResponse,
  UpdateSupplyMovementRequest,
} from "./types";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

function getImportErrorData(error: unknown): BatchErrorPayload | undefined {
  const axiosError = error as AxiosError<BatchErrorPayload>;
  return axiosError?.response?.data ?? (error as BatchErrorPayload | undefined);
}

function getImportErrorMessage(error: unknown): string {
  const data = getImportErrorData(error);

  if (!data) {
    return "Error inesperado al importar insumos.";
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

  return "Error inesperado al importar insumos.";
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
    async (projectId: number): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
          `/supply_movements/${projectId}`
        );

        if (response.success) {
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
        setError("Ocurrio un error en la busqueda de movimientos");
      } catch (error) {
        setError(
          extractErrorMessage(error, "Error desconocido en la busqueda de movimientos.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
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
        const response = await apiClient.post<SuccessResponse<any>>(
          `/supply_movements/${projectId}`,
          supplyMovement
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: response.data,
          });
          return;
        }

        setErrorCreation("Ocurrio un error en la creación del movimiento");
      } catch (error) {
        setErrorCreation(
          extractErrorMessage(error, "Error desconocido en la creación del movimiento.")
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    []
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
        const response = await apiClient.post<SuccessResponse<any>>(
          `/supply_movements/${projectId}/import`,
          supplyMovement
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: response.data,
          });
          return;
        }

        setErrorCreation("Ocurrio un error en la importación del movimiento");
      } catch (error) {
        const payload = getImportErrorData(error) ?? null;
        setErrorCreationPayload(payload);
        setErrorCreation(
          getImportErrorMessage(error)
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    []
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
      const response = await apiClient.put<SuccessResponse<any>>(
        `/supply_movements/${supplyMovementId}/project/${projectId}`,
        supplyMovement
      );

      if (response.success) {
        dispatch({
          type: actions.SET_RESULT_CREATION,
          payload: response.data,
        });
        return true;
      }

      setErrorCreation("Ocurrio un error en la actualización del movimiento");
      return false;
    } catch (error) {
      setErrorCreation(
        extractErrorMessage(
          error,
          "Error desconocido en la actualización del movimiento."
        )
      );
      return false;
    } finally {
      setProcessingCreation(false);
    }
  },
  []
);


  const [processingDelete, setProcessingDelete] = useState(false);
  const [processingDetail, setProcessingDetail] = useState(false);

  const deleteSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      setProcessingDelete(true);
      setDeleteError(null);
      setDeleteResult(false);

      try {
        const response = await apiClient.delete<SuccessResponse<any>>(
          `/supply_movements/${id}/project/${projectId}`
        );

        if (response.success) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("Ocurrio un error en la eliminación del movimiento");
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setDeleteError(
            "No puede eliminar el movimiento porque existe un cierre de stock asociado."
          );
          return;
        }

        setDeleteError(
          extractErrorMessage(error, "Error desconocido en la eliminación del movimiento.")
        );
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

      if (response.success) {
        dispatch({
          type: actions.SET_SELECTED_SUPPLY_MOVEMENT,
          payload: response.data,
        });
        return;
      }

      setErrorCreation("Ocurrio un error en la busqueda del movimiento");
    } catch (error) {
      if (extractErrorStatus(error) === 404) {
        setErrorCreation("No se encontro el movimiento.");
        return;
      }

      setErrorCreation(
        extractErrorMessage(error, "Error desconocido en la busqueda del movimiento.")
      );
    } finally {
      setProcessingDetail(false);
    }
  }, []);

  return {
    supplyMovements,
    summary,
    getSupplyMovements,
    deleteSupplyMovement,
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
