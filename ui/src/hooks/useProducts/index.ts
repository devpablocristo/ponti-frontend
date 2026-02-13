import React, { useState } from "react";

import useProductReducer from "./productsReducer";
import * as actions from "./actions";
import { Product, Supply, SupplyResponse } from "./types";
import { SuccessResponse } from "../../restclient/types";
import APIClient from "../../restclient/apiInstance";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "../../utils/getApiErrorMessage";

const request = new APIClient({
  timeout: 15000,
  baseURL: "/api",
});

const useProducts = () => {
  const [{ products, result, supplies }, dispatch] = useProductReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);

  type CreatedSupply = {
    id: number;
    name: string;
  };

  const getSupplies = React.useCallback(async (projectId: number) => {
    setProcessing(true);
    try {
      const response = await request.get<SuccessResponse<SupplyResponse>>(
        `/supplies/${projectId}`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_SUPPLIES,
          payload: response.data.data,
        });
        return;
      }
      setError("Ocurrio un error en la busqueda de lotes");
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        setError("Ya existe un insumo con el mismo nombre.");
        return;
      }

      setError(
        getApiErrorMessage(err, "Error en el servicio, inténtalo más tarde.")
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const saveProducts = React.useCallback(
    async (products: Product[], projectId: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await request.put<SuccessResponse<CreatedSupply[]>>(
          `/supplies/${projectId}`,
          products
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se han creado los insumos con éxito!",
          });
          return response.data;
        }

        setError("Ocurrio un error en la creación de los insumos");
      } catch (error) {
        if (getApiErrorStatus(error) === 409) {
          setError("Ya existe un insumo con el mismo nombre.");
          return;
        }

        setError(
          getApiErrorMessage(
            error,
            "Error desconocido en la creación de los insumos."
          )
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const deleteSupply = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    dispatch({
      type: actions.SET_RESULT,
      payload: "",
    });

    try {
      const response = await request.delete<SuccessResponse<any>>(
        `/supplies/${id}`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_RESULT,
          payload: "Se ha eliminado el insumo con éxito!",
        });
        return;
      }

      setError("Ocurrio un error en la eliminación del insumo");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setError("El insumo esta siendo usado en una orden de trabajo.");
        return;
      }

      setError(
        getApiErrorMessage(
          error,
          "Error desconocido en la eliminación del insumo."
        )
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const updateSupply = React.useCallback(
    async (projectId: number, supply: Supply) => {
      setProcessing(true);
      setErrorUpdate(null);
      setResultUpdate(null);

      try {
        const response = await request.put<SuccessResponse<any>>(
          `/supplies/projects/${projectId}/${supply.id}`,
          supply
        );

        if (response.success) {
          setResultUpdate("Se editado el insumo con éxito!");
          return;
        }

        setErrorUpdate("Ocurrio un error en la edicion del insumo");
      } catch (error) {
        if (getApiErrorStatus(error) === 404) {
          setErrorUpdate("El insumo no existe.");
          return;
        }

        setErrorUpdate(
          getApiErrorMessage(error, "Error desconocido en la edicion del insumo.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    products,
    supplies,
    getSupplies,
    saveProducts,
    updateSupply,
    deleteSupply,
    processing,
    error,
    result,
    errorUpdate,
    resultUpdate,
  };
};

export default useProducts;
