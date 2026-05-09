import { useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { Data as Campaign, Payload } from "./types";
import {
  CrudService,
  useEntityCrud,
} from "../useEntityCrud";

export type CampaignPayloadInput = {
  name: string;
};

export type { Campaign };

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useCampaigns = () => {
  const service = useMemo<
    CrudService<Campaign, CampaignPayloadInput, CampaignPayloadInput>
  >(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/campaigns" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<Payload>>(
          "/campaigns/archived" + buildQuery(query),
        );
        return { data: response.data.data, total: response.data.total };
      },
      create: async (input) => {
        const response = await apiClient.post<SuccessResponse<Campaign>>(
          "/campaigns",
          input,
        );
        return response.data;
      },
      update: async (id, input) => {
        await apiClient.put<SuccessResponse<string>>(
          `/campaigns/${id}`,
          input,
        );
        return { id, ...input } as Campaign;
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/campaigns/${id}/archive`,
          {},
        );
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<string>>(
          `/campaigns/${id}/restore`,
          {},
        );
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<string>>(`/campaigns/${id}/hard`);
      },
    }),
    [],
  );

  const crud = useEntityCrud<Campaign, CampaignPayloadInput, CampaignPayloadInput>(
    service,
  );

  return {
    campaigns: crud.data,
    archivedCampaigns: crud.archivedData,
    total: crud.total,
    processing: crud.processing,
    error: crud.error,
    getCampaigns: crud.list,
    getArchivedCampaigns: crud.listArchived,
    createCampaign: crud.create,
    updateCampaign: crud.update,
    archiveCampaign: crud.archive,
    restoreCampaign: crud.restore,
    hardDeleteCampaign: crud.hardDelete,
  };
};

export default useCampaigns;
