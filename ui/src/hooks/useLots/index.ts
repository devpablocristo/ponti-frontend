import React, { useState } from "react";

import * as actions from "./actions";
import useLotsReducer from "./useLotsReducer";
import { apiClient } from "@/api/client";
import { Crop, LotsDataUpdate, Payload, LotKPIs } from "./types";
import { SuccessResponse } from "@/api/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

const useLots = () => {
  const [{ lots, pageInfo, crops, result, kpis }, dispatch] = useLotsReducer();
  const [processing, setProcessing] = useState(false);
  const [processingKpis, setProcessingKpis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKpis, setErrorKpis] = useState<string | null>(null);
  const [updateLotError, setUpdateLotError] = useState<string | null>(null);

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

  const updateLot = React.useCallback(
    async (lot: LotsDataUpdate) => {
      setProcessing(true);
      setUpdateLotError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.put<SuccessResponse<any>>(
          `/lots/${lot.id}`,
          lot
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se ha modificado el lote con éxito!",
          });
          return;
        }

        setUpdateLotError("Ocurrio un error en la modificacion del lote");
      } catch (error) {
        setUpdateLotError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const updateTons = React.useCallback(
    async (id: number, tons: number) => {
      setProcessingTons(true);
      setErrorTons(null);
      setResultTons(null);

      try {
        const response = await apiClient.put<SuccessResponse<any>>(
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
    [dispatch]
  );

  return {
    lots,
    pageInfo,
    updateLot,
    updateTons,
    getLots,
    getLotsKpis,
    crops,
    getCrops,
    processing,
    error,
    updateLotError,
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
