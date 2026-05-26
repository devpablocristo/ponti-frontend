import React, { useState } from "react";

import useCommercializationsReducer from "./commercializationsReducer";
import * as actions from "./actions";
import { CommercializationData, CommercializationInfoData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatError } from "@/lib/format";

type CommercializationMutationResponse = SuccessResponse<unknown>;

const useCommercializations = () => {
  const [{ result, commercializations }, dispatch] = useCommercializationsReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCommercializations = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await apiClient.get<SuccessResponse<CommercializationInfoData[]>>(
        `/projects/${id}/commercializations`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_COMMERCIALIZATIONS,
          payload: response.data,
        });
        return;
      }

      setError("No se pudieron cargar los valores de comercialización.");
    } catch (error) {
      // 404 acá no es un error real: el proyecto puede no tener comercializaciones
      // todavía. Se mapea a lista vacía sin mostrar toast.
      if (extractErrorStatus(error) === 404) {
        dispatch({
          type: actions.SET_COMMERCIALIZATIONS,
          payload: [],
        });
        return;
      }

      setError(formatError(error, { fallback: "No se pudieron cargar los valores de comercialización." }));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const saveCommercializations = React.useCallback(
    async (commercializationData: CommercializationData[], id: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.post<CommercializationMutationResponse>(
          `/projects/${id}/commercializations`,
          commercializationData
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se guardaron los valores de comercialización.",
          });
          return;
        }

        setError("No se pudieron guardar los valores de comercialización.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron guardar los valores de comercialización." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  return {
    processing,
    error,
    getCommercializations,
    saveCommercializations,
    result,
    commercializations,
  };
};

export default useCommercializations;
