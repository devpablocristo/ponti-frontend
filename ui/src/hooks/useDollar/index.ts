import React, { useState } from "react";

import useDollarReducer from "./dollarReducer";
import * as actions from "./actions";
import { DollarData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

const useDollar = () => {
  const [{ dollars, result }, dispatch] = useDollarReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDollarInfo = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    dispatch({
      type: actions.SET_RESULT,
      payload: "",
    });

    try {
      const response = await apiClient.get<SuccessResponse<DollarData[]>>(
        `/projects/${id}/dollar-values`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_DOLLARS,
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
  }, []);

  const saveDollarInfo = React.useCallback(
    async (dollar: DollarData[], id: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.put<SuccessResponse<any>>(
          `/projects/${id}/dollar-values`,
          dollar
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se han creado los valores con éxito!",
          });
          return;
        }

        setError("Ocurrio un error en la creación de los valores");
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setError("Ya existe un valor con el mismo nombre.");
          return;
        }

        setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    dollars,
    processing,
    error,
    getDollarInfo,
    saveDollarInfo,
    result,
  };
};

export default useDollar;
