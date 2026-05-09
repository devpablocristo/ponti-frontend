import React, { useReducer, useRef } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

export type Investor = {
  id: number;
  name: string;
  percentage?: number;
  archived_at?: string | null;
};

export type InvestorPayloadInput = {
  name: string;
  percentage?: number;
};

type InvestorPayload = {
  data: Investor[];
  total: number;
};

type State = {
  total: number;
  investors: Investor[];
  processing: boolean;
  error: string;
};

type Action =
  | { type: "SET_INVESTORS"; payload: Investor[] }
  | { type: "SET_TOTAL"; payload: number }
  | { type: "SET_ERROR"; payload: string }
  | { type: "START_PROCESSING" }
  | { type: "STOP_PROCESSING" };

const initialState: State = {
  total: 0,
  investors: [],
  processing: false,
  error: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INVESTORS":
      return { ...state, investors: action.payload };
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

const useInvestors = () => {
  const [{ total, investors, processing, error }, dispatch] = useReducer(reducer, initialState);
  const lastQueryRef = useRef<string>("limit=1000");

  const getInvestors = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });

      let queryParams = "";
      if (queryString !== "") {
        lastQueryRef.current = queryString;
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<InvestorPayload>>(
          "/investors" + queryParams
        );
        if (response.success) {
          dispatch({ type: "SET_INVESTORS", payload: response.data.data });
          dispatch({ type: "SET_TOTAL", payload: response.data.total });
          return;
        }
        dispatch({ type: "SET_ERROR", payload: "Ocurrió un error en la búsqueda de inversores." });
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: extractErrorMessage(err, "Error en el servicio, inténtalo más tarde."),
        });
      } finally {
        dispatch({ type: "STOP_PROCESSING" });
      }
    },
    [],
  );

  const getArchivedInvestors = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });

      let queryParams = "";
      if (queryString !== "") queryParams = `?${queryString}`;

      try {
        const response = await apiClient.get<SuccessResponse<InvestorPayload>>(
          "/investors/archived" + queryParams
        );
        if (response.success) {
          dispatch({ type: "SET_INVESTORS", payload: response.data.data });
          dispatch({ type: "SET_TOTAL", payload: response.data.total });
          return;
        }
        dispatch({ type: "SET_ERROR", payload: "Ocurrió un error al listar inversores archivados." });
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: extractErrorMessage(err, "Error en el servicio, inténtalo más tarde."),
        });
      } finally {
        dispatch({ type: "STOP_PROCESSING" });
      }
    },
    [],
  );

  const createInvestor = React.useCallback(
    async (input: InvestorPayloadInput): Promise<Investor | null> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.post<SuccessResponse<Investor>>(
          "/investors",
          input,
        );
        if (response.success) {
          await getInvestors(lastQueryRef.current);
          return response.data ?? null;
        }
        const message = "Ocurrió un error al crear el inversor.";
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
    [getInvestors],
  );

  const updateInvestor = React.useCallback(
    async (id: number, input: InvestorPayloadInput): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.put<SuccessResponse<string>>(
          "/investors/" + id,
          input,
        );
        if (response.success) {
          await getInvestors(lastQueryRef.current);
          return;
        }
        const message = "Ocurrió un error al actualizar el inversor.";
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
    [getInvestors],
  );

  const archiveInvestor = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.post<SuccessResponse<string>>(
          "/investors/" + id + "/archive",
          {}
        );
        if (response.success) {
          await getInvestors(lastQueryRef.current);
          return;
        }
        const message = "Ocurrió un error al intentar archivar el inversor.";
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
    [getInvestors],
  );

  const restoreInvestor = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.post<SuccessResponse<string>>(
          "/investors/" + id + "/restore",
          {}
        );
        if (response.success) {
          await getInvestors(lastQueryRef.current);
          return;
        }
        const message = "Ocurrió un error al intentar restaurar el inversor.";
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
    [getInvestors],
  );

  const hardDeleteInvestor = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "START_PROCESSING" });
      try {
        const response = await apiClient.delete<SuccessResponse<string>>(
          "/investors/" + id + "/hard"
        );
        if (response.success) {
          await getArchivedInvestors("limit=1000");
          return;
        }
        const message = "Ocurrió un error al intentar eliminar el inversor.";
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
    [getArchivedInvestors],
  );

  return {
    getInvestors,
    getArchivedInvestors,
    createInvestor,
    updateInvestor,
    archiveInvestor,
    restoreInvestor,
    hardDeleteInvestor,
    total,
    investors,
    processing,
    error,
  };
};

export default useInvestors;
