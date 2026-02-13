import React, { useState } from "react";
import APIClient from "../../restclient/apiInstance";

import * as actions from "./actions";
import useOrdersReducer from "./ordersReducer";
import { SuccessResponse } from "../../restclient/types";
import { SupplyMovement, SupplyMovementRequest, SupplyResponse } from "./types";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "../../utils/getApiErrorMessage";

const request = new APIClient({
  timeout: 15000,
  baseURL: "/api",
});

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

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState(false);

  const getSupplyMovements = React.useCallback(
    async (projectId: number): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const response = await request.get<SuccessResponse<SupplyResponse>>(
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
          getApiErrorMessage(error, "Error desconocido en la busqueda de movimientos.")
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
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: {
          supply_movements: [],
        },
      });

      try {
        const response = await request.post<SuccessResponse<any>>(
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
          getApiErrorMessage(error, "Error desconocido en la creación del movimiento.")
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    []
  );

  const updateSupplyMovement = React.useCallback(
    async (supplyMovementId: number, supplyMovement: SupplyMovementRequest) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      dispatch({
        type: actions.SET_RESULT_CREATION,
        payload: {
          supply_movements: [],
        },
      });

      try {
        const response = await request.put<SuccessResponse<any>>(
          `/supply_movements/${supplyMovementId}`,
          supplyMovement
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_CREATION,
            payload: response.data,
          });
          return;
        }

        setErrorCreation("Ocurrio un error en la actualización del movimiento");
      } catch (error) {
        setErrorCreation(
          getApiErrorMessage(
            error,
            "Error desconocido en la actualización del movimiento."
          )
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    []
  );

  const deleteSupplyMovement = React.useCallback(
    async (id: number, projectId: number) => {
      try {
        setDeleteError(null);
        setDeleteResult(false);

        const response = await request.delete<SuccessResponse<any>>(
          `/supply_movements/${id}/project/${projectId}`
        );

        if (response.success) {
          setDeleteResult(true);
          return;
        }

        setDeleteError("Ocurrio un error en la eliminación del movimiento");
      } catch (error) {
        if (getApiErrorStatus(error) === 409) {
          setDeleteError(
            "No puede eliminar el movimiento porque existe un cierre de stock asociado."
          );
          return;
        }

        setDeleteError(
          getApiErrorMessage(error, "Error desconocido en la eliminación del movimiento.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const getSupplyMovement = React.useCallback(async (id: number) => {
    try {
      const response = await request.get<SuccessResponse<SupplyMovement>>(
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
      if (getApiErrorStatus(error) === 404) {
        setErrorCreation("No se encontro el movimiento.");
        return;
      }

      setErrorCreation(
        getApiErrorMessage(error, "Error desconocido en la busqueda del movimiento.")
      );
    } finally {
      setProcessingCreation(false);
    }
  }, []);

  return {
    supplyMovements,
    summary,
    getSupplyMovements,
    deleteSupplyMovement,
    deleteError,
    deleteResult,
    saveSupplyMovement,
    updateSupplyMovement,
    getSupplyMovement,
    selectedSupplyMovement,
    resultCreation,
    processing,
    error,
    processingCreation,
    errorCreation,
    pageInfo,
  };
};

export default useSupplyMovements;
