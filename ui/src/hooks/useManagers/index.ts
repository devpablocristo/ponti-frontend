import { useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import {
  CrudService,
  useEntityCrud,
} from "../useEntityCrud";

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

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useManagers = () => {
  const service = useMemo<
    CrudService<Manager, ManagerPayloadInput, ManagerPayloadInput>
  >(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<ManagerPayload>>(
          "/managers" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<ManagerPayload>>(
          "/managers/archived" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      create: async (input) => {
        const response = await apiClient.post<SuccessResponse<Manager>>(
          "/managers",
          input,
        );
        return response.data;
      },
      update: async (id, input) => {
        await apiClient.put<SuccessResponse<string>>(`/managers/${id}`, input);
        return { id, ...input } as Manager;
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/managers/${id}/archive`,
          {},
        );
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/managers/${id}/restore`,
          {},
        );
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<string>>(`/managers/${id}/hard`);
      },
    }),
    [],
  );

  const crud = useEntityCrud<Manager, ManagerPayloadInput, ManagerPayloadInput>(
    service,
  );

  return {
    managers: crud.data,
    archivedManagers: crud.archivedData,
    total: crud.total,
    processing: crud.processing,
    error: crud.error,
    getManagers: crud.list,
    getArchivedManagers: crud.listArchived,
    createManager: crud.create,
    updateManager: crud.update,
    archiveManager: crud.archive,
    restoreManager: crud.restore,
    hardDeleteManager: crud.hardDelete,
  };
};

export default useManagers;
