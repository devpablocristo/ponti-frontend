import React, { useState } from "react";
import { AxiosError } from "axios";

import useCommercializationsReducer from "./commercializationsReducer";
import * as actions from "./actions";
import { CommercializationData, CommercializationInfoData } from "./types";
import { SuccessResponse, ErrorResponse } from "@/api/types";
import { apiClient } from "@/api/client";

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

      setError("Ocurrio un error en la busqueda de los valores");
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const errorResponse = axiosError.response.data as ErrorResponse;

        if (errorResponse.error) {
          if (errorResponse.error.status === 404) {
            dispatch({
              type: actions.SET_COMMERCIALIZATIONS,
              payload: [],
            });
            return;
          }
          const message =
            errorResponse.error.details ||
            "Error desconocido en la busqueda de los valores.";

          setError(message);
          return;
        }
      }

      setError("Error en el servicio, inténtalo más tarde.");
    } finally {
      setProcessing(false);
    }
  }, []);

  const saveCommercializations = React.useCallback(
    async (commercializationData: CommercializationData[], id: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.post<SuccessResponse<any>>(
          `/projects/${id}/commercializations`,
          commercializationData
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
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            if (errorResponse.error.status === 409) {
              setError("Ya existe un valor con el mismo nombre.");
              return;
            }
            const message =
              errorResponse.error.details ||
              "Error desconocido en la creación de los valores.";

            setError(message);
            return;
          }
        }

        setError("Error en el servicio, inténtalo más tarde.");
      } finally {
        setProcessing(false);
      }
    },
    []
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
