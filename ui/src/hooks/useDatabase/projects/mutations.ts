import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { ProjectAction } from "./projectReducer";
import { Project } from "./types";

type MutationDeps = {
  dispatch: React.Dispatch<ProjectAction>;
};

export function createProjectMutations(deps: MutationDeps) {
  const { dispatch } = deps;

  const saveProject = async (userData: Project): Promise<void> => {
    dispatch({ type: actions.SET_RESULT, payload: "" });
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING });
    try {
      const response = await apiClient.post<SuccessResponse<Project>>("/projects", userData);
      if (response.success) {
        dispatch({
          type: actions.SET_RESULT,
          payload: "Se ha creado un nuevo proyecto con éxito!",
        });
        return;
      }
      dispatch({ type: actions.SET_ERROR, payload: "No se pudo crear el proyecto." });
    } catch (error) {
      dispatch({
        type: actions.SET_ERROR,
        payload: formatError(error, { fallback: "No se pudo crear el proyecto." }),
      });
    } finally {
      dispatch({ type: actions.STOP_PROCESSING });
    }
  };

  const updateProject = async (id: number, project: Project): Promise<void> => {
    dispatch({ type: actions.SET_RESULT, payload: "" });
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING });
    try {
      const response = await apiClient.put<SuccessResponse<Project>>(
        `/projects/${id}`,
        project,
      );
      if (response.success) {
        dispatch({ type: actions.SET_RESULT, payload: "Proyecto editado con exito" });
        return;
      }
      dispatch({ type: actions.SET_ERROR, payload: "No se pudo actualizar el proyecto." });
    } catch (error) {
      // 404 / outdated lo cubre translateBackendError vía pattern
      // "project not found or outdated"; 409 vía "X already exists".
      // El interceptor global agrega userMessage para 5xx/network/timeout.
      dispatch({
        type: actions.SET_ERROR,
        payload: formatError(error, { fallback: "No se pudo actualizar el proyecto." }),
      });
    } finally {
      dispatch({ type: actions.STOP_PROCESSING });
    }
  };

  // Lifecycle actions (archive, restore, hardDelete) comparten estructura.
  const lifecycleAction = async (
    method: "post" | "delete",
    url: string,
    successMessage: string,
    fallbackMessage: string,
  ): Promise<void> => {
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING });
    try {
      const response =
        method === "post"
          ? await apiClient.post<SuccessResponse<string>>(url, {})
          : await apiClient.delete<SuccessResponse<string>>(url);
      if (response.success) {
        dispatch({ type: actions.SET_RESULT, payload: successMessage });
        return;
      }
      dispatch({ type: actions.SET_ERROR, payload: fallbackMessage });
      throw new Error(fallbackMessage);
    } catch (error) {
      const message = formatError(error, { fallback: fallbackMessage });
      dispatch({ type: actions.SET_ERROR, payload: message });
      throw new Error(message);
    } finally {
      dispatch({ type: actions.STOP_PROCESSING });
    }
  };

  // deleteProject envía a /archive (soft delete con archived_at).
  // hardDeleteProject envía a /hard (delete fisico, requiere archived).
  const deleteProject = (id: number) =>
    lifecycleAction(
      "post",
      `/projects/${id}/archive`,
      "Proyecto archivado con éxito",
      "No se pudo archivar el proyecto.",
    );

  const restoreProject = (id: number) =>
    lifecycleAction(
      "post",
      `/projects/${id}/restore`,
      "Proyecto restaurado con éxito",
      "No se pudo restaurar el proyecto.",
    );

  const hardDeleteProject = (id: number) =>
    lifecycleAction(
      "delete",
      `/projects/${id}/hard`,
      "Proyecto eliminado con éxito",
      "No se pudo eliminar el proyecto.",
    );

  return { saveProject, updateProject, deleteProject, restoreProject, hardDeleteProject };
}
