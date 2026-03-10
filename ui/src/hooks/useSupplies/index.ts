import React, { useState } from "react";

import useSupplyReducer from "./suppliesReducer";
import * as actions from "./actions";
import { SupplyCreatePayload, Supply, SupplyResponse } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

type SupplyMutationResponse = SuccessResponse<unknown>;
type SupplyWorkOrdersCountResponse = SuccessResponse<{ count: number }>;

const useSupplies = () => {
  const [{ supplies, result }, dispatch] = useSupplyReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);

  const getSupplies = React.useCallback(async (projectId: number) => {
    setProcessing(true);
    try {
      const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
        `/supplies/${projectId}`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_SUPPLIES,
          payload: response.data.data,
        });
        return;
      }
      setError("Ocurrio un error en la busqueda de lotes");
    } catch (err) {
      if (extractErrorStatus(err) === 409) {
        setError("Ya existe un insumo con el mismo nombre.");
        return;
      }

      setError(
        extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.")
      );
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const saveSupplies = React.useCallback(
    async (supplies: SupplyCreatePayload[], projectId: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.put<SupplyMutationResponse>(
          `/supplies/${projectId}`,
          supplies
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se han creado los insumos con éxito!",
          });
          return;
        }

        setError("Ocurrio un error en la creación de los insumos");
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setError("Ya existe un insumo con el mismo nombre.");
          return;
        }

        setError(
          extractErrorMessage(
            error,
            "Error desconocido en la creación de los insumos."
          )
        );
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const deleteSupply = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    dispatch({
      type: actions.SET_RESULT,
      payload: "",
    });

    try {
      const response = await apiClient.delete<SupplyMutationResponse>(`/supplies/${id}`);

      if (response.success) {
        dispatch({
          type: actions.SET_RESULT,
          payload: "Se ha eliminado el insumo con éxito!",
        });
        return;
      }

      setError("Ocurrio un error en la eliminación del insumo");
    } catch (error) {
      if (extractErrorStatus(error) === 409) {
        setError("El insumo esta siendo usado en una orden de trabajo.");
        return;
      }

      setError(
        extractErrorMessage(
          error,
          "Error desconocido en la eliminación del insumo."
        )
      );
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const getWorkOrdersCount = React.useCallback(
    async (supplyId: number): Promise<number> => {
      try {
        const response = await apiClient.get<SupplyWorkOrdersCountResponse>(
          `/supplies/workorders-count/${supplyId}`
        );
        if (response.success) {
          return response.data?.count ?? 0;
        }
        return 0;
      } catch {
        return 0;
      }
    },
    []
  );

  const updateSupply = React.useCallback(
    async (projectId: number, supply: Supply) => {
      setProcessing(true);
      setErrorUpdate(null);
      setResultUpdate(null);

      try {
        const response = await apiClient.put<SupplyMutationResponse>(
          `/supplies/projects/${projectId}/${supply.id}`,
          supply
        );

        if (response.success) {
          setResultUpdate("Se editado el insumo con éxito!");
          return;
        }

        setErrorUpdate("Ocurrio un error en la edicion del insumo");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorUpdate("El insumo no existe.");
          return;
        }

        setErrorUpdate(
          extractErrorMessage(error, "Error desconocido en la edicion del insumo.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    supplies,
    getSupplies,
    saveSupplies,
    updateSupply,
    deleteSupply,
    getWorkOrdersCount,
    processing,
    error,
    result,
    errorUpdate,
    resultUpdate,
  };
};

export default useSupplies;
