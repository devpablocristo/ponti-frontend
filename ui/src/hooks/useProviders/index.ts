import React from "react";

import * as actions from "./actions";

import { apiClient } from "@/api/client";
import { Payload } from "./types";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import providersReducer from "./providersReducer";

const useProviders = () => {
  const [{ total, providers, processing, error }, dispatch] =
    providersReducer();

  const getProviders = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/providers" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_PROVIDERS,
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
          payload: "No se pudieron cargar los proveedores.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudieron cargar los proveedores." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  return {
    getProviders,
    total,
    providers,
    processing,
    error,
  };
};

export default useProviders;
