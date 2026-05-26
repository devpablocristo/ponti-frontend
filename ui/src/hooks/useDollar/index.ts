import React, { useState } from "react";

import useDollarReducer from "./dollarReducer";
import * as actions from "./actions";
import { DollarData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";

type DollarMutationResponse = SuccessResponse<unknown>;

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

      setError("No se pudieron cargar los valores de cotización.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar los valores de cotización." }));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const saveDollarInfo = React.useCallback(
    async (dollar: DollarData[], id: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.put<DollarMutationResponse>(
          `/projects/${id}/dollar-values`,
          dollar
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se guardaron los valores de cotización.",
          });
          return;
        }

        setError("No se pudieron guardar los valores de cotización.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron guardar los valores de cotización." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
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
