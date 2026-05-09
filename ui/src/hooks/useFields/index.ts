import { useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { Data as Field, Payload } from "./types";
import {
  CrudService,
  useEntityCrud,
} from "../useEntityCrud";

export type { Field };

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useFields = () => {
  const service = useMemo<CrudService<Field>>(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/fields" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/fields/archived" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/fields/${id}/archive`,
          {},
        );
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/fields/${id}/restore`,
          {},
        );
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<string>>(`/fields/${id}/hard`);
      },
    }),
    [],
  );

  const crud = useEntityCrud<Field>(service);

  return {
    fields: crud.data,
    archivedFields: crud.archivedData,
    total: crud.total,
    processing: crud.processing,
    error: crud.error,
    getFields: crud.list,
    getArchivedFields: crud.listArchived,
    archiveField: crud.archive,
    restoreField: crud.restore,
    hardDeleteField: crud.hardDelete,
  };
};

export default useFields;
