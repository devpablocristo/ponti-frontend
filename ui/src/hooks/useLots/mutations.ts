import type { Dispatch, MutableRefObject } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./lotsReducer";
import type { LotsData } from "./types";

type LotMutationResponse = SuccessResponse<unknown>;

type MutationDeps = {
  dispatch: Dispatch<Action>;
  lotsRef: MutableRefObject<LotsData[]>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingTons: (v: boolean) => void;
  setErrorTons: (v: string | null) => void;
  setResultTons: (v: string | null) => void;
};

export function createLotMutations(deps: MutationDeps) {
  const {
    dispatch,
    lotsRef,
    setProcessing,
    setError,
    setProcessingTons,
    setErrorTons,
    setResultTons,
  } = deps;

  const lifecycleAction = async (
    method: "post" | "delete",
    url: string,
    fallbackMessage: string,
  ): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response =
        method === "post"
          ? await apiClient.post<LotMutationResponse>(url, {})
          : await apiClient.delete<LotMutationResponse>(url);
      if (!response.success) {
        setError(fallbackMessage);
        throw new Error(fallbackMessage);
      }
    } catch (err) {
      const message = formatError(err, { fallback: fallbackMessage });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  };

  const archiveLot = (id: number) =>
    lifecycleAction("post", `/lots/${id}/archive`, "No se pudo archivar el lote.");

  const restoreLot = (id: number) =>
    lifecycleAction("post", `/lots/${id}/restore`, "No se pudo restaurar el lote.");

  const hardDeleteLot = (id: number) =>
    lifecycleAction("delete", `/lots/${id}/hard`, "No se pudo eliminar el lote.");

  // updateTons usa su propio par processingTons/errorTons/resultTons porque
  // es una mutation muy frecuente (inline en celda de tabla) y necesita feedback
  // independiente del flujo principal.
  //
  // Optimistic update: aplica el nuevo `tons` al state local INMEDIATAMENTE
  // (la celda muestra el valor sin esperar al server). Si el server rechaza,
  // dispatchamos de nuevo con el valor previo guardado en `previousTons` para
  // hacer rollback. El usuario ve el cambio fluido en happy path y un rollback
  // visible + toast de error en fallo.
  const updateTons = async (id: number, tons: number) => {
    const previousLot = lotsRef.current.find((lot) => lot.id === id);
    const previousTons = previousLot ? previousLot.tons : null;

    setProcessingTons(true);
    setErrorTons(null);
    setResultTons(null);

    dispatch({ type: actions.SET_LOT_TONS, payload: { id, tons: String(tons) } });

    try {
      const response = await apiClient.put<LotMutationResponse>(`/lots/${id}/tons`, {
        tons,
      });
      if (response.success) {
        setResultTons("Se actualizaron las toneladas del lote.");
        return;
      }
      // Server respondió OK pero success=false: rollback + error.
      dispatch({ type: actions.SET_LOT_TONS, payload: { id, tons: previousTons } });
      setErrorTons("No se pudieron actualizar las toneladas del lote.");
    } catch (error) {
      // Network / 4xx / 5xx: rollback al valor previo.
      dispatch({ type: actions.SET_LOT_TONS, payload: { id, tons: previousTons } });
      setErrorTons(
        formatError(error, {
          fallback: "No se pudieron actualizar las toneladas del lote.",
        }),
      );
    } finally {
      setProcessingTons(false);
    }
  };

  return { archiveLot, restoreLot, hardDeleteLot, updateTons };
}
