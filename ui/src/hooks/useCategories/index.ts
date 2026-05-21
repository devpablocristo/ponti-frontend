import React, { useState } from "react";

import * as actions from "./actions";

import { apiClient } from "@/api/client";
import { TypeData, CategoryData } from "./types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";
import useCategoriesReducer from "./useCategoriesReducer";

const useCategories = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [{ categories, types }, dispatch] = useCategoriesReducer();

  const getCategories = React.useCallback(
    async (queryString: string): Promise<void> => {
      setProcessing(true);
      setError(null);

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        // El interceptor en `api/client.ts` envuelve la respuesta del BE en
        // `{success: true, data: <body>}`, así que `response.data` es el body
        // del BE: `{data: CategoryData[], page_info}`.
        const response = await apiClient.get<{
          success?: boolean;
          data?: { data?: CategoryData[] };
        }>("/categories" + queryParams);

        if (response.data?.data) {
          dispatch({
            type: actions.SET_CATEGORIES,
            payload: response.data.data,
          });
          return;
        }

        setError("Ocurrio un error en la busqueda de categorías");
      } catch (error) {
        setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const getTypes = React.useCallback(async (): Promise<void> => {
    setProcessing(true);
    setError(null);

    try {
      // `response.data` viene envuelto por el interceptor: contiene el body
      // del BE, que es `{data: TypeData[], page_info}`.
      const response = await apiClient.get<{
        success?: boolean;
        data?: { data?: TypeData[] };
      }>("/types");

      if (response.data?.data) {
        dispatch({
          type: actions.SET_TYPES,
          payload: response.data.data,
        });
        return;
      }

      setError("Ocurrio un error en la busqueda de tipos");
    } catch (error) {
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  return {
    getCategories,
    getTypes,
    categories,
    types,
    processing,
    error,
  };
};

export default useCategories;
