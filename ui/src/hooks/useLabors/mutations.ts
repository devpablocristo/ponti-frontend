import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import { translateLaborDetail } from "./helpers";
import type { Action } from "./laborsReducer";
import { LaborInfo, LaborToSave } from "./types";

type CreatedLaborResult = {
  labor_name: string;
  labor_id: number;
  is_saved: boolean;
  error_detail: string;
};

type LaborMutationResponse = SuccessResponse<{
  labors_ids?: CreatedLaborResult[];
  message?: string;
}>;

type MutationDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
  setErrorUpdate: (v: string | null) => void;
  setResultUpdate: (v: string | null) => void;
};

export function createLaborMutations(deps: MutationDeps) {
  const { dispatch, setProcessing, setError, setErrorUpdate, setResultUpdate } = deps;

  // saveLabors es batch: parsea labors_ids[] del response y mapea errores por
  // fila usando translateLaborDetail. Retorna boolean (true = todas OK).
  const saveLabors = async (laborsToSave: LaborToSave[], projectId: number): Promise<boolean> => {
    setProcessing(true);
    setError(null);
    dispatch({ type: actions.SET_RESULT, payload: "" });
    try {
      const response = await apiClient.post<LaborMutationResponse>(
        `/projects/${projectId}/labors`,
        laborsToSave,
      );

      const createdLabors = response.data?.labors_ids ?? [];
      const failedLabors = createdLabors.filter(
        (labor) => !labor.is_saved || !!labor.error_detail,
      );

      if (failedLabors.length > 0) {
        const message = failedLabors
          .map((labor) => translateLaborDetail(labor.error_detail?.trim() || ""))
          .filter(Boolean)
          .join("\n");
        setError(message || "No se pudieron crear todas las labores.");
        return false;
      }

      if (response.success) {
        dispatch({ type: actions.SET_RESULT, payload: "Se crearon las labores." });
        return true;
      }

      setError("No se pudieron crear las labores.");
      return false;
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron crear las labores." }));
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // updateLabor usa su propio par errorUpdate/resultUpdate porque es la única
  // operación que necesita feedback de actualización separado del flujo principal.
  const updateLabor = async (projectId: number, labor: LaborInfo) => {
    setProcessing(true);
    setErrorUpdate(null);
    setResultUpdate(null);
    try {
      const response = await apiClient.put<LaborMutationResponse>(
        `/labors/projects/${projectId}/${labor.id}`,
        labor,
      );
      if (response.success) {
        setResultUpdate("Se actualizó la labor.");
        return;
      }
      setErrorUpdate("No se pudo actualizar la labor.");
    } catch (error) {
      setErrorUpdate(formatError(error, { fallback: "No se pudo actualizar la labor." }));
    } finally {
      setProcessing(false);
    }
  };

  const deleteLabor = async (id: number) => {
    setProcessing(true);
    setError(null);
    dispatch({ type: actions.SET_RESULT, payload: "" });
    try {
      const response = await apiClient.delete<LaborMutationResponse>(`/labors/${id}/hard`);
      if (response.success) {
        dispatch({ type: actions.SET_RESULT, payload: "Se eliminó la labor." });
        return;
      }
      setError("No se pudo eliminar la labor.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudo eliminar la labor." }));
    } finally {
      setProcessing(false);
    }
  };

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
          ? await apiClient.post<LaborMutationResponse>(url, {})
          : await apiClient.delete<LaborMutationResponse>(url);
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

  const archiveLabor = (id: number) =>
    lifecycleAction("post", `/labors/${id}/archive`, "No se pudo archivar la labor.");

  const restoreLabor = (id: number) =>
    lifecycleAction("post", `/labors/${id}/restore`, "No se pudo restaurar la labor.");

  const hardDeleteLabor = (id: number) =>
    lifecycleAction("delete", `/labors/${id}/hard`, "No se pudo eliminar la labor.");

  return {
    saveLabors,
    updateLabor,
    deleteLabor,
    archiveLabor,
    restoreLabor,
    hardDeleteLabor,
  };
}
