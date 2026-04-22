import React, { useState } from "react";
import { AxiosError } from "axios";

import { apiClient } from "@/api/client";
import { ErrorResponse, SuccessResponse } from "@/api/types";

import { StockCountRequest, StockCountResult } from "./types";

type CreateStockCountResponse = SuccessResponse<{
  id: number;
  message: string;
}>;

const useStockCount = () => {
  const [resultCreation, setResultCreation] = useState<StockCountResult[]>([]);
  const [processingCreation, setProcessingCreation] = useState(false);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);

  const createStockCounts = React.useCallback(
    async (projectId: number, items: StockCountRequest[]) => {
      setProcessingCreation(true);
      setErrorCreation(null);
      setResultCreation([]);

      try {
        const settled = await Promise.allSettled(
          items.map(async (item) => {
            const response = await apiClient.post<CreateStockCountResponse>(
              `/stock/${projectId}/supplies/${item.supply_id}/counts`,
              {
                counted_units: item.counted_units,
                counted_at: item.counted_at.toISOString(),
                note: item.note,
              }
            );

            if (!response.success) {
              return {
                supply_id: item.supply_id,
                is_saved: false,
                error_detail: "No se pudo registrar el conteo físico.",
              } satisfies StockCountResult;
            }

            return {
              supply_id: item.supply_id,
              is_saved: true,
              error_detail: "",
            } satisfies StockCountResult;
          })
        );

        const results = settled.map((entry, index) => {
          if (entry.status === "fulfilled") {
            return entry.value;
          }

          const axiosError = entry.reason as AxiosError;
          const responseData = axiosError.response?.data as ErrorResponse | undefined;
          return {
            supply_id: items[index].supply_id,
            is_saved: false,
            error_detail:
              responseData?.error?.details ||
              "Error en el servicio, inténtalo más tarde.",
          } satisfies StockCountResult;
        });

        setResultCreation(results);
      } catch {
        setErrorCreation("Error en el servicio, inténtalo más tarde.");
      } finally {
        setProcessingCreation(false);
      }
    },
    []
  );

  return {
    createStockCounts,
    resultCreation,
    processingCreation,
    errorCreation,
  };
};

export default useStockCount;
