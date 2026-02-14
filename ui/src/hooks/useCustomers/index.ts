import React, { useRef } from "react";

import * as actions from "./actions";

import useCustomersReducer from "./useCustomersReducer";
import { apiClient } from "@/api/client";
import { CustomerPayload } from "./types";
import { AxiosError } from "axios";
import { ErrorResponse, SuccessResponse } from "@/api/types";

const useCustomers = () => {
  const [{ total, customers, processing, error }, dispatch] =
    useCustomersReducer();
  const lastQueryRef = useRef<string>("limit=1000");

  const getCustomers = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        lastQueryRef.current = queryString;
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<CustomerPayload>>(
          "/customers" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_CUSTOMERS,
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
          payload: "Ocurrio un error en la busqueda de clientes",
        });
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido en la busqueda de clientes.";

            dispatch({
              type: actions.SET_ERROR,
              payload: message,
            });
            return;
          }
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "Error en el servicio, inténtalo más tarde.",
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const getArchivedCustomers = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<CustomerPayload>>(
          "/customers/archived" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_CUSTOMERS,
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
          payload: "Ocurrió un error en la búsqueda de clientes archivados.",
        });
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido en la búsqueda de clientes archivados.";

            dispatch({
              type: actions.SET_ERROR,
              payload: message,
            });
            return;
          }
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "Error en el servicio, inténtalo más tarde.",
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const archiveCustomer = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.put<SuccessResponse<string>>(
          "/customers/" + id + "/archive",
          {}
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "limit=1000");
          return;
        }

        const message = "Ocurrió un error al intentar archivar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido al intentar archivar el cliente.";

            dispatch({
              type: actions.SET_ERROR,
              payload: message,
            });
            throw new Error(message);
          }
        }

        const message = "Error en el servicio, inténtalo más tarde.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch, getCustomers]
  );

  const restoreCustomer = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.put<SuccessResponse<string>>(
          "/customers/" + id + "/restore",
          {}
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "limit=1000");
          return;
        }

        const message = "Ocurrió un error al intentar restaurar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido al intentar restaurar el cliente.";

            dispatch({
              type: actions.SET_ERROR,
              payload: message,
            });
            throw new Error(message);
          }
        }

        const message = "Error en el servicio, inténtalo más tarde.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch, getCustomers]
  );

  const hardDeleteCustomer = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.delete<SuccessResponse<string>>(
          "/customers/" + id + "/hard"
        );

        if (response.success) {
          await getArchivedCustomers("limit=1000");
          return;
        }

        const message = "Ocurrió un error al intentar eliminar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const errorResponse = axiosError.response.data as ErrorResponse;

          if (errorResponse.error) {
            const message =
              errorResponse.error.details ||
              "Error desconocido al intentar eliminar el cliente.";

            dispatch({
              type: actions.SET_ERROR,
              payload: message,
            });
            throw new Error(message);
          }
        }

        const message = "Error en el servicio, inténtalo más tarde.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch, getArchivedCustomers]
  );

  return {
    getCustomers,
    getArchivedCustomers,
    archiveCustomer,
    restoreCustomer,
    hardDeleteCustomer,
    total,
    customers,
    processing,
    error,
  };
};

export default useCustomers;
