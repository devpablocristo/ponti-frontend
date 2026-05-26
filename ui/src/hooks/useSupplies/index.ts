import React, { useState } from "react";

import useSupplyReducer from "./suppliesReducer";
import * as actions from "./actions";
import {
  SupplyCreatePayload,
  Supply,
  SupplyResponse,
  SuppliesMode,
} from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatError } from "@/lib/format";

type SupplyMutationResponse = SuccessResponse<unknown>;
type SupplyWorkOrdersCountResponse = SuccessResponse<{ count: number }>;
type DeleteSupplyResult = "deleted" | "conflict" | "error";

const useSupplies = () => {
  const [{ supplies, result }, dispatch] = useSupplyReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);

  const getSupplies = React.useCallback(
    async (projectId: number, mode: SuppliesMode = "all") => {
      setProcessing(true);
      try {
        const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
          `/supplies?project_id=${projectId}&mode=${mode}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_SUPPLIES,
            payload: response.data.data,
          });
          return;
        }

        setError("No se pudieron cargar los insumos.");
      } catch (err) {
        setError(formatError(err, { fallback: "No se pudieron cargar los insumos." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

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
            payload: "Se guardaron los insumos.",
          });
          return true;
        }

        setError("No se pudieron guardar los insumos.");
        return false;
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron guardar los insumos." }));
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const deleteSupply = React.useCallback(
    async (id: number): Promise<DeleteSupplyResult> => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.delete<SupplyMutationResponse>(
          `/supplies/${id}/hard`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se eliminó el insumo.",
          });
          return "deleted";
        }

        setError("No se pudo eliminar el insumo.");
      } catch (error) {
        // El caller distingue "conflict" para mostrar un drawer con las OT
        // bloqueando; el resto cae a toast de error con copy traducida.
        if (extractErrorStatus(error) === 409) {
          return "conflict";
        }

        setError(formatError(error, { fallback: "No se pudo eliminar el insumo." }));
      } finally {
        setProcessing(false);
      }

      return "error";
    },
    [dispatch]
  );

  const archiveSupply = React.useCallback(
    async (id: number): Promise<boolean> => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.post<SupplyMutationResponse>(
          `/supplies/${id}/archive`,
          {}
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se archivó el insumo.",
          });
          return true;
        }

        const message = "No se pudo archivar el insumo.";
        setError(message);
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo archivar el insumo." });
        setError(message);
        throw new Error(message);
      } finally {
        setProcessing(false);
      }
    },
    [dispatch],
  );

  const restoreSupply = React.useCallback(
    async (id: number): Promise<void> => {
      setProcessing(true);
      setError(null);
      try {
        const response = await apiClient.post<SupplyMutationResponse>(
          `/supplies/${id}/restore`,
          {}
        );
        if (!response.success) {
          const message = "No se pudo restaurar el insumo.";
          setError(message);
          throw new Error(message);
        }
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo restaurar el insumo." });
        setError(message);
        throw new Error(message);
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const hardDeleteSupply = React.useCallback(
    async (id: number): Promise<void> => {
      setProcessing(true);
      setError(null);
      try {
        const response = await apiClient.delete<SupplyMutationResponse>(
          `/supplies/${id}/hard`
        );
        if (!response.success) {
          const message = "No se pudo eliminar el insumo.";
          setError(message);
          throw new Error(message);
        }
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo eliminar el insumo." });
        setError(message);
        throw new Error(message);
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const getArchivedSupplies = React.useCallback(
    async (queryString: string): Promise<void> => {
      setProcessing(true);
      setError(null);
      let queryParams = "";
      if (queryString !== "") queryParams = `?${queryString}`;
      try {
        const response = await apiClient.get<SuccessResponse<SupplyResponse>>(
          "/supplies/archived" + queryParams,
        );
        if (response.success) {
          dispatch({ type: actions.SET_SUPPLIES, payload: response.data.data });
          return;
        }
        setError("No se pudieron cargar los insumos archivados.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar los insumos archivados." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch],
  );

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
          setResultUpdate("Se actualizó el insumo.");
          return;
        }

        setErrorUpdate("No se pudo actualizar el insumo.");
      } catch (error) {
        setErrorUpdate(formatError(error, { fallback: "No se pudo actualizar el insumo." }));
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const completePendingSupply = React.useCallback(
    async (projectId: number, supply: Supply) => {
      setProcessing(true);
      setErrorUpdate(null);
      setResultUpdate(null);

      try {
        const response = await apiClient.put<SupplyMutationResponse>(
          `/supplies/pending/${supply.id}/complete`,
          {
            project_id: projectId,
            name: supply.name,
            price: supply.price,
            unit_id: supply.unit_id,
            category_id: supply.category_id,
            type_id: supply.type_id,
            is_partial_price: Boolean(supply.is_partial_price),
          }
        );

        if (response.success) {
          setResultUpdate("Se completó el insumo pendiente.");
          return;
        }

        setErrorUpdate("No se pudo completar el insumo pendiente.");
      } catch (error) {
        setErrorUpdate(formatError(error, { fallback: "No se pudo completar el insumo pendiente." }));
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    supplies,
    getSupplies,
    getArchivedSupplies,
    saveSupplies,
    updateSupply,
    deleteSupply,
    archiveSupply,
    restoreSupply,
    hardDeleteSupply,
    completePendingSupply,
    getWorkOrdersCount,
    processing,
    error,
    result,
    errorUpdate,
    resultUpdate,
  };
};

export default useSupplies;
