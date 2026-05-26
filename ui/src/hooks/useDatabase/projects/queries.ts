import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { ProjectAction } from "./projectReducer";
import { Project, ProjectDropdownPayload, ProjectPayload } from "./types";

type QueryDeps = {
  dispatch: React.Dispatch<ProjectAction>;
};

export function createProjectQueries(deps: QueryDeps) {
  const { dispatch } = deps;

  const fetchProjectList = async (
    url: string,
    fallbackMessage: string,
  ): Promise<void> => {
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING });
    try {
      const response = await apiClient.get<SuccessResponse<ProjectPayload>>(url);
      if (response.success) {
        dispatch({ type: actions.SET_PROJECTS, payload: response.data.data });
        dispatch({ type: actions.SET_PAGINATION, payload: response.data.page_info });
        dispatch({ type: actions.SET_TOTAL_HECTARES, payload: response.data.total_hectares });
        return;
      }
      dispatch({ type: actions.SET_ERROR, payload: fallbackMessage });
    } catch (error) {
      dispatch({
        type: actions.SET_ERROR,
        payload: formatError(error, { fallback: fallbackMessage }),
      });
    } finally {
      dispatch({ type: actions.STOP_PROCESSING });
    }
  };

  const getProjects = (queryString: string) =>
    fetchProjectList(
      `/projects${queryString ? `?${queryString}` : ""}`,
      "No se pudieron cargar los proyectos.",
    );

  const getArchivedProjects = (queryString: string) =>
    fetchProjectList(
      `/projects/archived${queryString ? `?${queryString}` : ""}`,
      "No se pudieron cargar los proyectos archivados.",
    );

  const getProjectsDropdown = async (id: number, queryString: string = ""): Promise<void> => {
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING_DROPDOWN });
    try {
      const response = await apiClient.get<SuccessResponse<ProjectDropdownPayload>>(
        `/projects/customers/${id}${queryString ? `?${queryString}` : ""}`,
      );
      if (response.success) {
        dispatch({ type: actions.SET_PROJECTS_DROPDOWN, payload: response.data.data });
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
        payload: formatError(error, {
          fallback: "No se pudieron cargar los proyectos del cliente.",
        }),
      });
    } finally {
      dispatch({ type: actions.STOP_PROCESSING_DROPDOWN });
    }
  };

  const getProject = async (id: number): Promise<void> => {
    dispatch({ type: actions.SET_RESULT, payload: "" });
    dispatch({ type: actions.CLEAR_SELECTED_PROJECT });
    dispatch({ type: actions.SET_ERROR, payload: "" });
    dispatch({ type: actions.START_PROCESSING });
    try {
      const response = await apiClient.get<SuccessResponse<Project>>(`/projects/${id}`);
      if (response.success) {
        dispatch({ type: actions.SET_SELECTED_PROJECT, payload: response.data });
        return;
      }
      dispatch({ type: actions.SET_ERROR, payload: "No se pudo cargar el proyecto." });
    } catch (error) {
      dispatch({
        type: actions.SET_ERROR,
        payload: formatError(error, { fallback: "No se pudo cargar el proyecto." }),
      });
    } finally {
      dispatch({ type: actions.STOP_PROCESSING });
    }
  };

  return { getProjects, getArchivedProjects, getProjectsDropdown, getProject };
}
