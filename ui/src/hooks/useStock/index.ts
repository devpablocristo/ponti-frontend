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

  const [processingCloseStock, setProcessingCloseStock] = useState(false);
  const [errorCloseStock, setErrorCloseStock] = useState<string | null>(null);
  const [resultCloseStock, setResultCloseStock] = useState<string | null>(null);

  const [processingPeriods, setProcessingPeriods] = useState(false);
  const [errorPeriods, setErrorPeriods] = useState<string | null>(null);
  const [periods, setPeriods] = useState<string[] | null>(null);

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

  const getPeriods = React.useCallback(
    async (projectId: number): Promise<void> => {
      setProcessingPeriods(true);
      setErrorPeriods(null);

      try {
        const response = await apiClient.get<SuccessResponse<string[]>>(
          `/stock/periods/${projectId}`
        );

        if (response.success) {
          setPeriods(response.data);
          return;
        }
        setErrorPeriods("Ocurrio un error en la busqueda de PERIODOS");
      } catch (error) {
        setErrorPeriods(
          extractErrorMessage(error, "Error desconocido en la busqueda de periodos.")
        );
      } finally {
        setProcessingPeriods(false);
      }
    },
    []
  );

  const updateStock = React.useCallback(
    async (projectId: number, id: number, realStock: number) => {
      setProcessingStock(true);
      setErrorStock(null);
      setResultStock(null);

      try {
        const response = await apiClient.put<StockMutationResponse>(
          `/stock/${projectId}/${id}`,
          { real_stock_units: realStock }
        );

        if (response.success) {
          setResultStock("Se han actualizado el stock con éxito");
          return;
        }

        setErrorStock("Ocurrio un error en la modificacion del stock");
      } catch (error) {
        setErrorStock(
          extractErrorMessage(
            error,
            "Error desconocido en la modificacion del stock."
          )
        );
      } finally {
        setProcessingStock(false);
      }
    },
    []
  );

  const closeStock = React.useCallback(
    async (projectId: number, closeDate: string) => {
      setProcessingCloseStock(true);
      setErrorCloseStock(null);
      setResultCloseStock(null);

      try {
        const response = await apiClient.put<StockMutationResponse>(
          `/stock/close/${projectId}`,
          { close_date: closeDate }
        );

        if (response.success) {
          setResultCloseStock("Se ha cerrado el stock con éxito");
          return;
        }

        setErrorCloseStock("Ocurrio un error en el cierre del stock");
      } catch (error) {
        setErrorCloseStock(
          extractErrorMessage(error, "Error desconocido en el cierre del stock.")
        );
      } finally {
        setProcessingCloseStock(false);
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
    closeStock,
    processingCloseStock,
    errorCloseStock,
    resultCloseStock,
    getPeriods,
    processingPeriods,
    errorPeriods,
    periods,
  };
};

export default useStock;
