import React, { useState } from "react";

import * as actions from "./actions";
import useLotsReducer from "./useLotsReducer";
import { apiClient } from "@/api/client";
import { Crop, Payload, LotKPIs } from "./types";
import { SuccessResponse } from "@/api/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

type LotMutationResponse = SuccessResponse<unknown>;

const useLots = () => {
  const [{ lots, pageInfo, crops, result, kpis }, dispatch] = useLotsReducer();
  const [processing, setProcessing] = useState(false);
  const [processingKpis, setProcessingKpis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKpis, setErrorKpis] = useState<string | null>(null);

  const [processingTons, setProcessingTons] = useState(false);
  const [errorTons, setErrorTons] = useState<string | null>(null);
  const [resultTons, setResultTons] = useState<string | null>(null);

  const getLots = React.useCallback(
    async (queryString: string) => {
      setProcessing(true);
      setError(null);
      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/lots" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_LOTS,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_PAGE_INFO,
            payload: response.data.page_info,
          });
          return;
        }

        setError("Ocurrio un error en la busqueda de lotes");
      } catch (error) {
        setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const getLotsKpis = React.useCallback(
    async (queryString: string) => {
      setProcessingKpis(true);
      setErrorKpis(null);
      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<LotKPIs>>(
          "/lots/metrics" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_KPIS,
            payload: response.data,
          });
          return;
        }

        setErrorKpis("Ocurrio un error en la busqueda de kpis");
      } catch (error) {
        setErrorKpis(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessingKpis(false);
      }
    },
    [dispatch]
  );

  const getCrops = React.useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await apiClient.get<SuccessResponse<Crop[]>>("/crops");

      if (response.success) {
        dispatch({
          type: actions.SET_CROPS,
          payload: response.data,
        });
        return;
      }

      setError("Ocurrio un error en la busqueda de lotes");
    } catch (error) {
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const getArchivedLots = React.useCallback(
    async (queryString: string) => {
      setProcessing(true);
      setError(null);
      let queryParams = "";
      if (queryString !== "") queryParams = `?${queryString}`;

      try {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/lots/archived" + queryParams
        );
        if (response.success) {
          dispatch({ type: actions.SET_LOTS, payload: response.data.data });
          dispatch({ type: actions.SET_PAGE_INFO, payload: response.data.page_info });
          return;
        }
        setError("Ocurrió un error al listar lotes archivados");
      } catch (err) {
        setError(extractErrorMessage(err, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const archiveLot = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<LotMutationResponse>(`/lots/${id}/archive`, {});
      if (!response.success) {
        const message = "Ocurrió un error al archivar el lote";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const restoreLot = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<LotMutationResponse>(`/lots/${id}/restore`, {});
      if (!response.success) {
        const message = "Ocurrió un error al restaurar el lote";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const hardDeleteLot = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.delete<LotMutationResponse>(`/lots/${id}/hard`);
      if (!response.success) {
        const message = "Ocurrió un error al eliminar el lote";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const updateTons = React.useCallback(
    async (id: number, tons: number) => {
      setProcessingTons(true);
      setErrorTons(null);
      setResultTons(null);

      try {
        const response = await apiClient.put<LotMutationResponse>(
          `/lots/${id}/tons`,
          { tons }
        );

        if (response.success) {
          setResultTons("Se han actualizado las toneladas con éxito");
          return;
        }

        setErrorTons("Ocurrio un error en la modificacion del lote");
      } catch (error) {
        setErrorTons(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessingTons(false);
      }
    },
    []
  );

  return {
    lots,
    pageInfo,
    updateTons,
    getLots,
    getArchivedLots,
    archiveLot,
    restoreLot,
    hardDeleteLot,
    getLotsKpis,
    crops,
    getCrops,
    processing,
    error,
    result,
    processingTons,
    errorTons,
    resultTons,
    setResultTons,
    kpis,
    processingKpis,
    errorKpis,
  };
};

export default useLots;
