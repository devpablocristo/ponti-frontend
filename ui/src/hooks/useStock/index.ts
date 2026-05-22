import React, { useState } from "react";
import { apiClient } from "@/api/client";

import useStockReducer from "./useStockReducer";
import * as actions from "./actions";
import { SuccessResponse } from "@/api/types";
import { GetStocksResponse } from "./types";
import { formatError } from "@/lib/format";
import { withQuery } from "@/lib/workspaceQuery";

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
    async (queryOrProjectId: string | number, cutOffDate: string): Promise<void> => {
      setProcessing(true);
      setError(null);

      try {
        const params =
          typeof queryOrProjectId === "number"
            ? new URLSearchParams({ project_id: String(queryOrProjectId) })
            : new URLSearchParams(queryOrProjectId);
        if (cutOffDate) {
          params.set("cutoff_date", cutOffDate);
        }
        const response = await apiClient.get<SuccessResponse<GetStocksResponse>>(
          withQuery("/stock", params.toString())
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
        setError("No se pudo cargar el stock.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudo cargar el stock." }));
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
        setErrorPeriods("No se pudieron cargar los períodos del stock.");
      } catch (error) {
        setErrorPeriods(formatError(error, { fallback: "No se pudieron cargar los períodos del stock." }));
      } finally {
        setProcessingPeriods(false);
      }
    },
    []
  );

  const updateStock = React.useCallback(
    async (
      projectId: number,
      id: number,
      realStock: number,
      updatedAt?: string | null
    ) => {
      setProcessingStock(true);
      setErrorStock(null);
      setResultStock(null);

      try {
        const payload = {
          real_stock_units: realStock,
          ...(updatedAt ? { updated_at: updatedAt } : {}),
        };

        const response = await apiClient.put<StockMutationResponse>(
          `/stock/${projectId}/${id}`,
          payload
        );

        if (response.success) {
          setResultStock("Se actualizó el stock.");
          return;
        }

        setErrorStock("No se pudo actualizar el stock.");
      } catch (error) {
        setErrorStock(formatError(error, { fallback: "No se pudo actualizar el stock." }));
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
          setResultCloseStock("Se cerró el stock.");
          return;
        }

        setErrorCloseStock("No se pudo cerrar el stock.");
      } catch (error) {
        setErrorCloseStock(formatError(error, { fallback: "No se pudo cerrar el stock." }));
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
