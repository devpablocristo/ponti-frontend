import React from "react";

import * as actions from "./actions";
import { apiClient } from "@/api/client";
import { Project, ProjectPayload, ProjectDropdownPayload } from "./types";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import useProjectReducer from "./projectReducer";

const useProjects = () => {
  const [
    {
      projects,
      totalHectares,
      projectsDropdown,
      projectsDropdownPagination,
      pageInfo,
      selectedProject,
      error,
      processing,
      processingDropdown,
      result,
    },
    dispatch,
  ] = useProjectReducer();

  const saveProject = React.useCallback(
    async (userData: Project): Promise<void> => {
      dispatch({ type: actions.SET_RESULT, payload: "" });
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.post<SuccessResponse<Project>>(
          "/projects",
          userData
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se ha creado un nuevo proyecto con éxito!",
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "No se pudo crear el proyecto.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudo crear el proyecto." }),
        });
        return;
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const getProjects = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<ProjectPayload>>(
          "/projects" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_PROJECTS,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_PAGINATION,
            payload: response.data.page_info,
          });

          dispatch({
            type: actions.SET_TOTAL_HECTARES,
            payload: response.data.total_hectares,
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "No se pudieron cargar los proyectos.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudieron cargar los proyectos." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const getProjectsDropdown = React.useCallback(
    async (id: number, queryString: string = ""): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING_DROPDOWN });

      try {
        const response = await apiClient.get<
          SuccessResponse<ProjectDropdownPayload>
        >(`/projects/customers/${id}` + (queryString ? `?${queryString}` : ""));

        if (response.success) {
          dispatch({
            type: actions.SET_PROJECTS_DROPDOWN,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_PROJECTS_DROPDOWN_PAGINATION,
            payload: response.data.page_info,
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR_DROPDOWN,
          payload: "No se pudieron cargar los proyectos del cliente.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR_DROPDOWN,
          payload: formatError(error, { fallback: "No se pudieron cargar los proyectos del cliente." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING_DROPDOWN });
      }
    },
    [dispatch]
  );

  const getProject = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_RESULT, payload: "" });
      dispatch({ type: actions.CLEAR_SELECTED_PROJECT });
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.get<SuccessResponse<Project>>(
          "/projects/" + id
        );

        if (response.success) {
          dispatch({
            type: actions.SET_SELECTED_PROJECT,
            payload: response.data,
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "No se pudo cargar el proyecto.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudo cargar el proyecto." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const updateProject = React.useCallback(
    async (id: number, project: Project): Promise<void> => {
      dispatch({ type: actions.SET_RESULT, payload: "" });
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.put<SuccessResponse<Project>>(
          "/projects/" + id,
          project
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Proyecto editado con exito",
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "No se pudo actualizar el proyecto.",
        });
      } catch (error) {
        // 404 / outdated lo cubre translateBackendError vía pattern
        // "project not found or outdated"; 409 vía "X already exists".
        // El interceptor global agrega userMessage para 5xx/network/timeout.
        const message = formatError(error, { fallback: "No se pudo actualizar el proyecto." });
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        return;
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const deleteProject = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.post<SuccessResponse<string>>(
          "/projects/" + id + "/archive",
          {}
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Proyecto archivado con éxito",
          });
          return;
        }

        const message = "No se pudo archivar el proyecto.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo archivar el proyecto." });
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const getArchivedProjects = React.useCallback(
    async (queryString: string): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      let queryParams = "";
      if (queryString !== "") {
        queryParams = `?${queryString}`;
      }

      try {
        const response = await apiClient.get<SuccessResponse<ProjectPayload>>(
          "/projects/archived" + queryParams
        );

        if (response.success) {
          dispatch({
            type: actions.SET_PROJECTS,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_PAGINATION,
            payload: response.data.page_info,
          });

          dispatch({
            type: actions.SET_TOTAL_HECTARES,
            payload: response.data.total_hectares,
          });
          return;
        }

        dispatch({
          type: actions.SET_ERROR,
          payload: "No se pudieron cargar los proyectos archivados.",
        });
      } catch (error) {
        dispatch({
          type: actions.SET_ERROR,
          payload: formatError(error, { fallback: "No se pudieron cargar los proyectos archivados." }),
        });
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const restoreProject = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.post<SuccessResponse<string>>(
          "/projects/" + id + "/restore",
          {}
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Proyecto restaurado con éxito",
          });
          return;
        }

        const message = "No se pudo restaurar el proyecto.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo restaurar el proyecto." });
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  const hardDeleteProject = React.useCallback(
    async (id: number): Promise<void> => {
      dispatch({ type: actions.SET_ERROR, payload: "" });
      dispatch({ type: actions.START_PROCESSING });

      try {
        const response = await apiClient.delete<SuccessResponse<string>>(
          "/projects/" + id + "/hard"
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Proyecto eliminado con éxito",
          });
          return;
        }

        const message = "No se pudo eliminar el proyecto.";
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } catch (error) {
        const message = formatError(error, { fallback: "No se pudo eliminar el proyecto." });
        dispatch({
          type: actions.SET_ERROR,
          payload: message,
        });
        throw new Error(message);
      } finally {
        dispatch({ type: actions.STOP_PROCESSING });
      }
    },
    [dispatch]
  );

  return {
    projects,
    totalHectares,
    projectsDropdown,
    pageInfo,
    projectsDropdownPagination,
    selectedProject,
    error,
    processing,
    processingDropdown,
    result,
    getProjects,
    getArchivedProjects,
    getProjectsDropdown,
    getProject,
    saveProject,
    updateProject,
    deleteProject,
    restoreProject,
    hardDeleteProject,
  };
};

export default useProjects;
