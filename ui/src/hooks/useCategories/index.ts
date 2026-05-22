import React, { useState } from "react";

import * as actions from "./actions";

import { apiClient } from "@/api/client";
import { TypeData, CategoryData } from "./types";
import { formatError } from "@/lib/format";
import categoriesReducer from "./categoriesReducer";

const useCategories = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [{ categories, types }, dispatch] = categoriesReducer();

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

        setError("No se pudieron cargar las categorías.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar las categorías." }));
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

      setError("No se pudieron cargar los tipos.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar los tipos." }));
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
