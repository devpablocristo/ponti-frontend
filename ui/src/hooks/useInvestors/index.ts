import { useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import {
  CrudService,
  useEntityCrud,
} from "../useEntityCrud";

export type Investor = {
  id: number;
  name: string;
  percentage?: number;
  archived_at?: string | null;
};

export type InvestorPayloadInput = {
  name: string;
  percentage?: number;
};

type InvestorPayload = {
  data: Investor[];
  total: number;
};

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useInvestors = () => {
  const service = useMemo<
    CrudService<Investor, InvestorPayloadInput, InvestorPayloadInput>
  >(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<InvestorPayload>>(
          "/investors" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<InvestorPayload>>(
          "/investors/archived" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      create: async (input) => {
        const response = await apiClient.post<SuccessResponse<Investor>>(
          "/investors",
          input,
        );
        return response.data;
      },
      update: async (id, input) => {
        await apiClient.put<SuccessResponse<string>>(`/investors/${id}`, input);
        return { id, ...input } as Investor;
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/investors/${id}/archive`,
          {},
        );
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/investors/${id}/restore`,
          {},
        );
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<string>>(
          `/investors/${id}/hard`,
        );
      },
    }),
    [],
  );

  const crud = useEntityCrud<Investor, InvestorPayloadInput, InvestorPayloadInput>(
    service,
  );

  return {
    investors: crud.data,
    archivedInvestors: crud.archivedData,
    total: crud.total,
    processing: crud.processing,
    error: crud.error,
    getInvestors: crud.list,
    getArchivedInvestors: crud.listArchived,
    createInvestor: crud.create,
    updateInvestor: crud.update,
    archiveInvestor: crud.archive,
    restoreInvestor: crud.restore,
    hardDeleteInvestor: crud.hardDelete,
  };
};

export default useInvestors;
