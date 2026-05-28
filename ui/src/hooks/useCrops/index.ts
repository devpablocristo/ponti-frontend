import { useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { CrudService, useEntityCrud } from "../useEntityCrud";
import {
  type Crop,
  type CropPayloadInput,
  normalizeCropMutationResponse,
  normalizeCropPayload,
} from "./types";

export type { Crop, CropPayloadInput };
export { normalizeCropPayload };

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useCrops = () => {
  const service = useMemo<CrudService<Crop, CropPayloadInput, CropPayloadInput>>(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<unknown>>(
          "/crops" + buildQuery(query),
        );
        return normalizeCropPayload(response.data);
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<unknown>>(
          "/crops/archived" + buildQuery(query),
        );
        return normalizeCropPayload(response.data);
      },
      get: async (id) => {
        const response = await apiClient.get<SuccessResponse<unknown>>(`/crops/${id}`);
        return normalizeCropMutationResponse(response.data, { name: "" });
      },
      create: async (input) => {
        const response = await apiClient.post<SuccessResponse<unknown>>("/crops", input);
        const created = normalizeCropMutationResponse(response.data, input);
        if (created.id > 0) {
          try {
            const fresh = await apiClient.get<SuccessResponse<unknown>>(`/crops/${created.id}`);
            return normalizeCropMutationResponse(fresh.data, input);
          } catch {
            return created;
          }
        }
        return created;
      },
      update: async (id, input) => {
        await apiClient.put<SuccessResponse<unknown>>(`/crops/${id}`, input);
        return { id, ...input };
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<unknown>>(`/crops/${id}/archive`, {});
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<unknown>>(`/crops/${id}/restore`, {});
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<unknown>>(`/crops/${id}/hard`);
      },
    }),
    [],
  );

  const crud = useEntityCrud<Crop, CropPayloadInput, CropPayloadInput>(service);

  return {
    crops: crud.data,
    archivedCrops: crud.archivedData,
    total: crud.total,
    archivedTotal: crud.archivedTotal,
    processing: crud.processing,
    error: crud.error,
    getCrops: crud.list,
    getArchivedCrops: crud.listArchived,
    getCrop: crud.get,
    createCrop: crud.create,
    updateCrop: crud.update,
    archiveCrop: crud.archive,
    restoreCrop: crud.restore,
    hardDeleteCrop: crud.hardDelete,
  };
};

export default useCrops;
