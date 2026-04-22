import React, { useState } from "react";
import { apiClient } from "@/api/client";

import useStockReducer from "./useStockReducer";
import * as actions from "./actions";
import { SuccessResponse } from "@/api/types";
import { GetStocksResponse } from "./types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

type StockMutationResponse = SuccessResponse<unknown>;

const useStock = () => {
  const [{ currentPage, stock, summary }, dispatch] = useStockReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processingStock, setProcessingStock] = useState(false);
  const [errorStock, setErrorStock] = useState<string | null>(null);
  const [resultStock, setResultStock] = useState<string | null>(null);

  const getStock = React.useCallback(
    async (projectId: number, cutOffDate: string): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const response = await apiClient.get<SuccessResponse<GetStocksResponse>>(
          `/stock/${projectId}?cutoff_date=${cutOffDate}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_SUMMARY,
            payload: {
              total_kg: response.data.total_kilograms,
              total_lt: response.data.total_liters,
              total_usd: response.data.net_total_usd,
            },
          });

          dispatch({
            type: actions.SET_STOCK,
            payload: response.data.items,
          });
          return;
        }
        setError("Ocurrio un error en la busqueda de STOCK");
      } catch (error) {
        setError(
          extractErrorMessage(error, "Error desconocido en la busqueda de stock.")
        );
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const updateStock = React.useCallback(
    async (projectId: number, supplyId: number, realStock: number) => {
      setProcessingStock(true);
      setErrorStock(null);
      setResultStock(null);

      try {
        const response = await apiClient.post<StockMutationResponse>(
          `/stock/${projectId}/supplies/${supplyId}/counts`,
          {
            counted_units: realStock,
            counted_at: new Date().toISOString(),
          }
        );

        if (response.success) {
          setResultStock("Se registró el conteo físico con éxito");
          return;
        }

        setErrorStock("Ocurrio un error al registrar el conteo físico");
      } catch (error) {
        setErrorStock(
          extractErrorMessage(
            error,
            "Error desconocido al registrar el conteo físico."
          )
        );
      } finally {
        setProcessingStock(false);
      }
    },
    []
  );

  return {
    stock,
    currentPage: currentPage,
    getStock,
    processing,
    error,
    summary,
    updateStock,
    processingStock,
    errorStock,
    resultStock,
  };
};

export default useStock;
