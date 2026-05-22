import { useMemo } from "react";

import { createProjectMutations } from "./mutations";
import useProjectReducer from "./projectReducer";
import { createProjectQueries } from "./queries";

/**
 * Hook compositor para projects. A diferencia de useWorkOrders/etc., el state
 * de processing/error vive **completamente en el reducer** (acciones
 * START_PROCESSING, STOP_PROCESSING, SET_ERROR, etc.), no en useState. Eso
 * hace los services más simples: solo dispatch, sin setters.
 *
 * 2 factory services:
 *   - queries.ts: getProjects, getArchivedProjects, getProjectsDropdown, getProject
 *   - mutations.ts: save, update, delete (archive), restore, hardDelete
 *
 * API público intacto post-refactor.
 */
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

  const queries = useMemo(() => createProjectQueries({ dispatch }), [dispatch]);
  const mutations = useMemo(() => createProjectMutations({ dispatch }), [dispatch]);

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
    getProjects: queries.getProjects,
    getArchivedProjects: queries.getArchivedProjects,
    getProjectsDropdown: queries.getProjectsDropdown,
    getProject: queries.getProject,
    saveProject: mutations.saveProject,
    updateProject: mutations.updateProject,
    deleteProject: mutations.deleteProject,
    restoreProject: mutations.restoreProject,
    hardDeleteProject: mutations.hardDeleteProject,
  };
};

export default useProjects;
