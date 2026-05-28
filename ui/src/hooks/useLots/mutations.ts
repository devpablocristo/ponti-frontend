import type { Dispatch, MutableRefObject } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./lotsReducer";
import type { LotsData, LotsDataUpdate } from "./types";

type LotMutationResponse = SuccessResponse<unknown>;
type CreateLotResponse = SuccessResponse<{ id: number }>;

type LotPayload = {
  name: string;
  lot_name: string;
  field_id: number;
  hectares: string;
  sowed_area: string;
  previous_crop_id: number;
  current_crop_id: number;
  season: string;
  variety: string;
  dates: Array<{
    sowing_date: string;
    harvest_date: string;
    sequence: number;
  }>;
};

type MutationDeps = {
  dispatch: Dispatch<Action>;
  lotsRef: MutableRefObject<LotsData[]>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProcessingTons: (v: boolean) => void;
  setErrorTons: (v: string | null) => void;
  setResultTons: (v: string | null) => void;
  setUpdateLotError: (v: string | null) => void;
};

function decimalInput(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(",", ".");
}

function lotPayload(lot: LotsDataUpdate, includeEmptyDates: boolean): LotPayload {
  const dates = (lot.dates ?? []).flatMap((date, index) => {
    if (!date) return [];

    const sowingDate = date.sowing_date || "";
    const harvestDate = date.harvest_date || "";
    if (!includeEmptyDates && !sowingDate && !harvestDate) return [];

    return [
      {
        sowing_date: sowingDate,
        harvest_date: harvestDate,
        sequence: date.sequence || index + 1,
      },
    ];
  });

  const hectares = decimalInput(lot.sowed_area);

  return {
    name: lot.lot_name.trim(),
    lot_name: lot.lot_name.trim(),
    field_id: Number(lot.field_id ?? 0),
    hectares,
    sowed_area: hectares,
    previous_crop_id: Number(lot.previous_crop_id || 0),
    current_crop_id: Number(lot.current_crop_id || 0),
    season: lot.season,
    variety: lot.variety,
    dates,
  };
}

export function createLotMutations(deps: MutationDeps) {
  const {
    dispatch,
    lotsRef,
    setProcessing,
    setError,
    setProcessingTons,
    setErrorTons,
    setResultTons,
    setUpdateLotError,
  } = deps;

  const lifecycleAction = async (
    method: "post" | "delete",
    url: string,
    fallbackMessage: string
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

  const createLot = async (lot: LotsDataUpdate) => {
    setProcessing(true);
    setUpdateLotError(null);
    dispatch({ type: actions.SET_RESULT, payload: "" });

    try {
      const payload = lotPayload(lot, false);
      const response = await apiClient.post<CreateLotResponse>("/lots", payload);
      if (response.success) {
        const createdId = Number(response.data?.id ?? 0);
        if (createdId > 0 && payload.dates.length > 0) {
          const dateResponse = await apiClient.put<LotMutationResponse>(
            `/lots/${createdId}`,
            lotPayload({ ...lot, id: createdId }, true)
          );
          if (!dateResponse.success) {
            setUpdateLotError("Se creó el lote, pero no se pudieron guardar las fechas.");
            return;
          }
        }
        dispatch({ type: actions.SET_RESULT, payload: "Se ha creado el lote con éxito!" });
        return;
      }
      setUpdateLotError("No se pudo crear el lote.");
    } catch (error) {
      setUpdateLotError(
        formatError(error, {
          fallback: "No se pudo crear el lote.",
        })
      );
    } finally {
      setProcessing(false);
    }
  };

  const updateLot = async (lot: LotsDataUpdate) => {
    setProcessing(true);
    setUpdateLotError(null);
    dispatch({ type: actions.SET_RESULT, payload: "" });

    try {
      const response = await apiClient.put<LotMutationResponse>(
        `/lots/${lot.id}`,
        lotPayload(lot, true)
      );
      if (response.success) {
        dispatch({ type: actions.SET_RESULT, payload: "Se ha modificado el lote con éxito!" });
        return;
      }
      setUpdateLotError("No se pudo modificar el lote.");
    } catch (error) {
      setUpdateLotError(
        formatError(error, {
          fallback: "No se pudo modificar el lote.",
        })
      );
    } finally {
      setProcessing(false);
    }
  };

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
        })
      );
    } finally {
      setProcessingTons(false);
    }
  };

  return { archiveLot, restoreLot, hardDeleteLot, createLot, updateLot, updateTons };
}
