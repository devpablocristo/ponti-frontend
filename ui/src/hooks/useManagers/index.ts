import React, { useReducer, useRef } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

export type Manager = {
  id: number;
  name: string;
  archived_at?: string | null;
};

export type ManagerPayloadInput = {
  name: string;
};

type ManagerPayload = {
  data: Manager[];
  total: number;
};

type State = {
  total: number;
  managers: Manager[];
  processing: boolean;
  error: string;
};

type Action =
  | { type: "SET_MANAGERS"; payload: Manager[] }
  | { type: "SET_TOTAL"; payload: number }
  | { type: "SET_ERROR"; payload: string }
  | { type: "START_PROCESSING" }
  | { type: "STOP_PROCESSING" };

const initialState: State = {
  total: 0,
  managers: [],
  processing: false,
  error: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_MANAGERS":
      return { ...state, managers: action.payload };
    case "SET_TOTAL":
      return { ...state, total: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "START_PROCESSING":
      return { ...state, processing: true };
    case "STOP_PROCESSING":
      return { ...state, processing: false };
    default:
      return state;
  }
}

const useManagers = () => {
  const [{ total, managers, processing, error }, dispatch] = useReducer(reducer, initialState);
  const lastQueryRef = useRef<string>("limit=1000");

  const getManagers = React.useCallback(async (queryString: string): Promise<void> => {
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "START_PROCESSING" });
    let queryParams = "";
    if (queryString !== "") {
      lastQueryRef.current = queryString;
      queryParams = `?${queryString}`;
    }
    try {
      const response = await apiClient.get<SuccessResponse<ManagerPayload>>(
        "/managers" + queryParams,
      );
      if (response.success) {
        dispatch({ type: "SET_MANAGERS", payload: response.data.data });
        dispatch({ type: "SET_TOTAL", payload: response.data.total });
        return;
      }
      dispatch({ type: "SET_ERROR", payload: "Ocurrió un error en la búsqueda de responsables." });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: extractErrorMessage(err, "Error en el servicio, inténtalo más tarde."),
      });
    } finally {
      dispatch({ type: "STOP_PROCESSING" });
    }
  }, []);

  const getArchivedManagers = React.useCallback(async (queryString: string): Promise<void> => {
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "START_PROCESSING" });
    let queryParams = "";
    if (queryString !== "") queryParams = `?${queryString}`;
    try {
      const response = await apiClient.get<SuccessResponse<ManagerPayload>>(
        "/managers/archived" + queryParams,
      );
      if (response.success) {
        dispatch({ type: "SET_MANAGERS", payload: response.data.data });
        dispatch({ type: "SET_TOTAL", payload: response.data.total });
        return;
      }
      dispatch({ type: "SET_ERROR", payload: "Ocurrió un error al listar responsables archivados." });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: extractErrorMessage(err, "Error en el servicio, inténtalo más tarde."),
      });
    } finally {
      dispatch({ type: "STOP_PROCESSING" });
    }
  }, []);

  const createManager = React.useCallback(
    async (input: ManagerPayloadInput): Promise<Manager | null> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.post<SuccessResponse<Manager>>(
          "/managers",
          input,
        );
        if (response.success) {
          return response.data ?? null;
        }
        const message = "Ocurrió un error al crear el responsable.";
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      } catch (err) {
        const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      } finally {
        dispatch({ type: "STOP_PROCESSING" });
      }
    },
    [],
  );

  const updateManager = React.useCallback(
    async (id: number, input: ManagerPayloadInput): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.put<SuccessResponse<string>>(
          "/managers/" + id,
          input,
        );
        if (!response.success) {
          const message = "Ocurrió un error al actualizar el responsable.";
          dispatch({ type: "SET_ERROR", payload: message });
          throw new Error(message);
        }
      } catch (err) {
        const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      } finally {
        dispatch({ type: "STOP_PROCESSING" });
      }
    },
    [],
  );

  const archiveManager = React.useCallback(async (id: number): Promise<void> => {
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "START_PROCESSING" });
    try {
      const response = await apiClient.post<SuccessResponse<string>>(
        "/managers/" + id + "/archive",
        {},
      );
      if (!response.success) {
        const message = "Ocurrió un error al archivar el responsable.";
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      dispatch({ type: "SET_ERROR", payload: message });
      throw new Error(message);
    } finally {
      dispatch({ type: "STOP_PROCESSING" });
    }
  }, []);

  const restoreManager = React.useCallback(async (id: number): Promise<void> => {
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "START_PROCESSING" });
    try {
      const response = await apiClient.post<SuccessResponse<string>>(
        "/managers/" + id + "/restore",
        {},
      );
      if (!response.success) {
        const message = "Ocurrió un error al restaurar el responsable.";
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      dispatch({ type: "SET_ERROR", payload: message });
      throw new Error(message);
    } finally {
      dispatch({ type: "STOP_PROCESSING" });
    }
  }, []);

  const hardDeleteManager = React.useCallback(async (id: number): Promise<void> => {
    dispatch({ type: "SET_ERROR", payload: "" });
    dispatch({ type: "START_PROCESSING" });
    try {
      const response = await apiClient.delete<SuccessResponse<string>>(
        "/managers/" + id + "/hard",
      );
      if (!response.success) {
        const message = "Ocurrió un error al eliminar el responsable.";
        dispatch({ type: "SET_ERROR", payload: message });
        throw new Error(message);
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Error en el servicio, inténtalo más tarde.");
      dispatch({ type: "SET_ERROR", payload: message });
      throw new Error(message);
    } finally {
      dispatch({ type: "STOP_PROCESSING" });
    }
  }, []);

  return {
    getManagers,
    getArchivedManagers,
    createManager,
    updateManager,
    archiveManager,
    restoreManager,
    hardDeleteManager,
    total,
    managers,
    processing,
    error,
  };
};

export default useManagers;
