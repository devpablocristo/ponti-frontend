import React, { useState } from "react";

import * as actions from "./actions";

import { apiClient } from "@/api/client";
import { TypeData, CategoryData } from "./types";
import { SuccessResponse } from "@/api/types";
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
        const response = await apiClient.get<SuccessResponse<CategoryData[]>>(
          "/categories" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_CATEGORIES,
            payload: response.data,
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
      const response = await apiClient.get<SuccessResponse<TypeData[]>>("/types");

      if (response.success) {
        dispatch({
          type: actions.SET_TYPES,
          payload: response.data,
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
