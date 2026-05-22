import React, { useState } from "react";
import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import { StockMovement, StockMovementRequest } from "./types";

type StockMovementResult = {
  supply_movement_id: number;
  is_saved: boolean;
  error_detail: string;
};

type StockMovementCreationResponse = SuccessResponse<{
  supply_movements: StockMovementResult[];
}>;

const useStockMovement = () => {
  const [resultCreation, setResultCreation] = useState<{
    supply_movements: StockMovementResult[];
  }>({ supply_movements: [] });
  const [processingCreation, setProcessingCreation] = useState(false);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  const saveStockMovement = React.useCallback(
    async (projectId: number, stockMovement: StockMovementRequest) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      setResultCreation({ supply_movements: [] });

      try {
        const response = await apiClient.post<StockMovementCreationResponse>(
          `/stock_movements/${projectId}`,
          stockMovement
        );

        if (response.success) {
          setResultCreation(response.data);
          return;
        }

        setErrorCreation("No se pudo crear el movimiento de stock.");
      } catch (error) {
        setErrorCreation(
          formatError(error, { fallback: "No se pudo crear el movimiento de stock." }),
        );
      } finally {
        setProcessingCreation(false);
      }
    },
    []
  );

  const getArchivedStockMovements = React.useCallback(async (projectId: number) => {
    const response = await apiClient.get<
      SuccessResponse<{ entries: StockMovement[] }>
    >(`/stock_movements/${projectId}/archived`);
    if (response.success) {
      setStockMovements(response.data.entries ?? []);
    }
    return response.data.entries ?? [];
  }, []);

  const archiveStockMovement = React.useCallback(
    async (projectId: number, id: number) => {
      await apiClient.post<SuccessResponse<string>>(
        `/stock_movements/${id}/project/${projectId}/archive`,
        {},
      );
    },
    [],
  );

  const restoreStockMovement = React.useCallback(
    async (projectId: number, id: number) => {
      await apiClient.post<SuccessResponse<string>>(
        `/stock_movements/${id}/project/${projectId}/restore`,
        {},
      );
    },
    [],
  );

  const hardDeleteStockMovement = React.useCallback(
    async (projectId: number, id: number) => {
      await apiClient.delete<SuccessResponse<string>>(
        `/stock_movements/${id}/project/${projectId}/hard`,
      );
    },
    [],
  );

  return {
    saveStockMovement,
    getArchivedStockMovements,
    archiveStockMovement,
    restoreStockMovement,
    hardDeleteStockMovement,
    stockMovements,
    resultCreation,
    processingCreation,
    errorCreation,
  };
};

export default useStockMovement;
