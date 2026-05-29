import React from "react";

import * as actions from "./actions";
import { apiClient } from "@/api/client";
import { Payload } from "./types";
import { SuccessResponse } from "@/api/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";
import useFieldsReducer from "./useFieldsReducer";

const useFields = () => {
  const [{ total, fields, processing, error }, dispatch] = useFieldsReducer();

  const getFields = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/fields" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_FIELDS,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_TOTAL,
            payload: response.data.total,
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "Ocurrio un error en la busqueda de campos",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  return {
    getFields,
    total,
    fields,
    processing,
    error,
  };
};

export default useFields;
