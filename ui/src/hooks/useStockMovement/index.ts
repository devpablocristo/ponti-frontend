import React, { useState } from "react";
import { AxiosError } from "axios";
import { apiClient } from "@/api/client";
import { SuccessResponse, ErrorResponse } from "@/api/types";
import { StockMovementRequest } from "./types";

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

        setErrorCreation("Ocurrió un error en la creación del movimiento");
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido en la creación del movimiento.";

            setErrorCreation(message);
            return;
          }
        }

        setErrorCreation("Error en el servicio, inténtalo más tarde.");
      } finally {
        setProcessingCreation(false);
      }
    },
    []
  );

  return {
    saveStockMovement,
    resultCreation,
    processingCreation,
    errorCreation,
  };
};

export default useStockMovement;
