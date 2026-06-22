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
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

type SupplyMutationResponse = SuccessResponse<unknown>;
type SupplyWorkOrdersCountResponse = SuccessResponse<{ count: number }>;
type DeleteSupplyResult = "deleted" | "conflict" | "in_use" | "error";

const useSupplies = () => {
  const [{ supplies, result }, dispatch] = useSupplyReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);

  const notifyWorkspaceDataUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("ponti:workspace-data-updated"));
  };

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

        setError("Ocurrio un error en la busqueda de insumos");
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
          `/supplies/${id}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se ha eliminado el insumo con éxito!",
          });
          return "deleted";
        }

        setError("Ocurrio un error en la eliminación del insumo");
      } catch (error) {
        const status = extractErrorStatus(error);
        if (status === 422) {
          // El insumo tiene registros ACTIVOS (órdenes, ingresos o remitos en uso).
          // No se puede eliminar ni archivar hasta quitar esos registros activos.
          return "in_use";
        }
        if (status === 409) {
          // El insumo solo tiene historial (registros ya eliminados): no se puede
          // borrar físicamente. El componente decide archivarlo en su lugar.
          return "conflict";
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
        const response = await apiClient.put<SupplyMutationResponse>(
          `/supplies/${id}/archive`,
          {}
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se ha archivado el insumo con éxito!",
          });
          return true;
        }

        setError("Ocurrio un error en el archivado del insumo");
      } catch (error) {
        setError(
          extractErrorMessage(
            error,
            "Error desconocido en el archivado del insumo."
          )
        );
      } finally {
        setProcessing(false);
      }

      return false;
    },
    [dispatch]
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
    async (projectId: number, supply: Supply): Promise<boolean> => {
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
          return true;
        }

        setErrorUpdate("Ocurrio un error en la edicion del insumo");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorUpdate("El insumo no existe.");
          return false;
        }

        setErrorUpdate(
          extractErrorMessage(error, "Error desconocido en la edicion del insumo.")
        );
      } finally {
        setProcessing(false);
      }

      return false;
    },
    []
  );

  const completePendingSupply = React.useCallback(
    async (projectId: number, supply: Supply): Promise<boolean> => {
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
          setResultUpdate("Se completó el insumo pendiente con éxito!");
          notifyWorkspaceDataUpdated();
          return true;
        }

        setErrorUpdate("Ocurrio un error al completar el insumo pendiente");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorUpdate("El insumo pendiente no existe.");
          return false;
        }

        setErrorUpdate(
          extractErrorMessage(
            error,
            "Error desconocido al completar el insumo pendiente."
          )
        );
      } finally {
        setProcessing(false);
      }

      return false;
    },
    []
  );

  return {
    supplies,
    getSupplies,
    saveSupplies,
    updateSupply,
    deleteSupply,
    archiveSupply,
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
