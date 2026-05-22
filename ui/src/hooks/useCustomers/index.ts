import React, { useRef } from "react";

import * as actions from "./actions";

import customersReducer from "./customersReducer";
import { apiClient } from "@/api/client";
import { CustomerData, CustomerPayload, CustomerPayloadInput } from "./types";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import { canonicalizeName } from "@/lib/properName";

function sanitizeInput(input: CustomerPayloadInput): CustomerPayloadInput {
  return { ...input, name: canonicalizeName(input.name) };
}

const useCustomers = () => {
  const [{ total, customers, processing, error }, dispatch] =
    customersReducer();
  const lastQueryRef = useRef<string>("per_page=1000");

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
          payload: "No se pudieron cargar los clientes.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudieron cargar los clientes." }),
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
          payload: "No se pudieron cargar los clientes archivados.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudieron cargar los clientes archivados." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const createCustomer = React.useCallback(
    async (input: CustomerPayloadInput): Promise<CustomerData | null> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.post<SuccessResponse<CustomerData>>(
          "/customers",
          sanitizeInput(input),
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "per_page=1000");
          return response.data ?? null;
        }

        const message = "No se pudo crear el cliente.";
        dispatch({ type: actions.SET_ERROR, payload: message });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo crear el cliente." });
        dispatch({ type: actions.SET_ERROR, payload: message });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch, getCustomers],
  );

  const updateCustomer = React.useCallback(
    async (id: number, input: CustomerPayloadInput): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.put<SuccessResponse<string>>(
          "/customers/" + id,
          sanitizeInput(input),
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "per_page=1000");
          return;
        }

        const message = "No se pudo actualizar el cliente.";
        dispatch({ type: actions.SET_ERROR, payload: message });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo actualizar el cliente." });
        dispatch({ type: actions.SET_ERROR, payload: message });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch, getCustomers],
  );

  const archiveCustomer = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.post<SuccessResponse<string>>(
          "/customers/" + id + "/archive",
          {}
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "per_page=1000");
          return;
        }

        const message = "No se pudo archivar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo archivar el cliente." });
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
        const response = await apiClient.post<SuccessResponse<string>>(
          "/customers/" + id + "/restore",
          {}
        );

        if (response.success) {
          await getCustomers(lastQueryRef.current || "per_page=1000");
          return;
        }

        const message = "No se pudo restaurar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo restaurar el cliente." });
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
          await getArchivedCustomers("per_page=1000");
          return;
        }

        const message = "No se pudo eliminar el cliente.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo eliminar el cliente." });
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
    createCustomer,
    updateCustomer,
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
