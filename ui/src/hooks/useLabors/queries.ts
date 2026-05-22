import { apiClient } from "@/api/client";
import { PaginatedResponse, SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";
import { withQuery } from "@/lib/workspaceQuery";

import * as actions from "./actions";
import { extractLaborsArray } from "./helpers";
import type { Action } from "./laborsReducer";
import { LaborGroupData, LaborInfo } from "./types";

type LaborGroupsResponse = SuccessResponse<PaginatedResponse<LaborGroupData>>;
type LaborsResponse = SuccessResponse<LaborInfo[]>;
type WorkOrdersCountResponse = SuccessResponse<{ count: number }>;

type QueryDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessing: (v: boolean) => void;
  setError: (v: string | null) => void;
};

export function createLaborQueries(deps: QueryDeps) {
  const { dispatch, setProcessing, setError } = deps;

  const getLaborGroups = async (query: string) => {
    setProcessing(true);
    setError(null);
    dispatch({ type: actions.SET_LABOR_GROUPS, payload: [] });
    try {
      const response = await apiClient.get<LaborGroupsResponse>(
        withQuery("/labors/group", query),
      );
      if (response.success) {
        dispatch({ type: actions.SET_LABOR_GROUPS, payload: response.data.data ?? [] });
        dispatch({
          type: actions.SET_PAGE_INFO,
          payload: {
            page: response.data.page_info.page,
            per_page: response.data.page_info.per_page,
            total: response.data.page_info.total,
            max_page: response.data.page_info.max_page,
          },
        });
        return;
      }
      setError("No se pudieron cargar las labores.");
    } catch (error) {
      setError(formatError(error, { fallback: "No se pudieron cargar las labores." }));
    } finally {
      setProcessing(false);
    }
  };

  const getLabors = async (projectId: number) => {
    setProcessing(true);
    setError(null);
    dispatch({ type: actions.SET_RESULT, payload: "" });
    try {
      const response = await apiClient.get<LaborsResponse>(`/projects/${projectId}/labors`);
      if (response.success) {
        const normalizedLabors = extractLaborsArray(response.data);
        dispatch({ type: actions.SET_LABORS, payload: normalizedLabors });
        return;
      }
      setError("No se pudieron cargar las labores del proyecto.");
    } catch (error) {
      setError(
        formatError(error, { fallback: "No se pudieron cargar las labores del proyecto." }),
      );
    } finally {
      setProcessing(false);
    }
  };

  const getArchivedLabors = async (projectId?: number | null) => {
    setProcessing(true);
    setError(null);
    try {
      const path =
        projectId && projectId > 0
          ? `/labors/projects/${projectId}/archived`
          : `/labors/archived`;
      const response = await apiClient.get<LaborsResponse>(path);
      if (response.success) {
        const normalized = extractLaborsArray(response.data);
        dispatch({ type: actions.SET_LABORS, payload: normalized });
        return;
      }
      setError("No se pudieron cargar las labores archivadas.");
    } catch (err) {
      setError(formatError(err, { fallback: "No se pudieron cargar las labores archivadas." }));
    } finally {
      setProcessing(false);
    }
  };

  // Sin side-effects en state: solo retorna count. No setea processing/error.
  const getWorkOrdersCount = async (projectId: number, laborId: number): Promise<number> => {
    try {
      const response = await apiClient.get<WorkOrdersCountResponse>(
        `/labors/workorders-count/${projectId}/${laborId}`,
      );
      if (response.success) {
        return response.data?.count ?? 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  return { getLaborGroups, getLabors, getArchivedLabors, getWorkOrdersCount };
}
