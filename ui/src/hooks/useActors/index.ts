import { useCallback, useMemo } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { canonicalizeName } from "@/lib/properName";
import { CrudService, useEntityCrud } from "../useEntityCrud";

export type ActorKind = "natural_person" | "organization" | "other" | "unknown";

export type ActorRole =
  | "cliente"
  | "responsable"
  | "inversor"
  | "arrendatario"
  | "proveedor"
  | "contratista"
  | "facturador";

export type ActorAlias = {
  id?: number;
  alias: string;
  source?: string | null;
};

export type ActorIdentifier = {
  id?: number;
  country: string;
  identifier_type: string;
  identifier_value: string;
  is_primary?: boolean;
};

type ActorPersonProfile = {
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  document_type?: string | null;
  document_number?: string | null;
};

type ActorOrganizationProfile = {
  legal_name?: string | null;
  trade_name?: string | null;
  legal_entity_type?: string | null;
  tax_condition?: string | null;
  fiscal_address?: string | null;
};

export type Actor = {
  id: number;
  tenant_id?: string;
  actor_kind: ActorKind;
  display_name: string;
  normalized_name?: string;
  primary_email?: string | null;
  primary_phone?: string | null;
  notes?: string | null;
  archived_at?: string | null;
  merged_into_actor_id?: number | null;
  roles: ActorRole[];
  aliases?: ActorAlias[];
  identifiers?: ActorIdentifier[];
  person_profile?: ActorPersonProfile | null;
  organization_profile?: ActorOrganizationProfile | null;
  created_at?: string;
  updated_at?: string;
};

export type ActorPayloadInput = {
  actor_kind: ActorKind;
  display_name: string;
  primary_email?: string | null;
  primary_phone?: string | null;
  notes?: string | null;
  roles?: ActorRole[];
  aliases?: Array<{ alias: string; source?: string | null }>;
  identifiers?: ActorIdentifier[];
  person_profile?: ActorPersonProfile | null;
  organization_profile?: ActorOrganizationProfile | null;
};

type ActorPayload = {
  data: Actor[];
  total: number;
};

export type ActorMergeImpact = {
  target_actor_id: number;
  source_actor_ids: number[];
  counts: Record<string, number>;
  confirmed: boolean;
};

type ActorMergeInput = {
  target_actor_id: number;
  source_actor_ids: number[];
  reason?: string;
  confirm?: boolean;
};

type DuplicateActor = {
  id: number;
  display_name: string;
  actor_kind: ActorKind;
  roles: ActorRole[];
};

export type DuplicateCandidate = {
  group_type: string;
  group_key: string;
  actors: DuplicateActor[];
};

const buildQuery = (queryString?: string) =>
  queryString && queryString !== "" ? `?${queryString}` : "";

const useActors = () => {
  const service = useMemo<CrudService<Actor, ActorPayloadInput, ActorPayloadInput>>(
    () => ({
      list: async (query) => {
        const response = await apiClient.get<SuccessResponse<ActorPayload>>(
          "/actors" + buildQuery(query)
        );
        return { data: response.data.data, total: response.data.total };
      },
      listArchived: async (query) => {
        const response = await apiClient.get<SuccessResponse<ActorPayload>>(
          "/actors/archived" + buildQuery(query)
        );
        return { data: response.data.data, total: response.data.total };
      },
      get: async (id) => {
        const response = await apiClient.get<SuccessResponse<Actor>>(`/actors/${id}`);
        return response.data;
      },
      create: async (input) => {
        const payload = { ...input, display_name: canonicalizeName(input.display_name) };
        const response = await apiClient.post<SuccessResponse<Actor | number>>("/actors", payload);
        if (typeof response.data === "number") {
          const created = await apiClient.get<SuccessResponse<Actor>>(`/actors/${response.data}`);
          return created.data;
        }
        return response.data;
      },
      update: async (id, input) => {
        const payload = { ...input, display_name: canonicalizeName(input.display_name) };
        const response = await apiClient.put<SuccessResponse<Actor>>(`/actors/${id}`, payload);
        return response.data;
      },
      archive: async (id) => {
        await apiClient.post<SuccessResponse<string>>(`/actors/${id}/archive`, {});
      },
      restore: async (id) => {
        await apiClient.post<SuccessResponse<string>>(`/actors/${id}/restore`, {});
      },
      hardDelete: async (id) => {
        await apiClient.delete<SuccessResponse<string>>(`/actors/${id}/hard`);
      },
    }),
    []
  );

  const crud = useEntityCrud<Actor, ActorPayloadInput, ActorPayloadInput>(service);

  const addRole = useCallback(async (id: number, role: ActorRole) => {
    await apiClient.post<SuccessResponse<string>>(`/actors/${id}/roles`, {
      role,
    });
  }, []);

  const addAlias = useCallback(async (id: number, alias: string, source?: string | null) => {
    await apiClient.post<SuccessResponse<number>>(`/actors/${id}/aliases`, {
      alias,
      source,
    });
  }, []);

  const mergeActors = useCallback(async (input: ActorMergeInput) => {
    const response = await apiClient.post<SuccessResponse<ActorMergeImpact>>(
      "/actors/merge",
      input
    );
    return response.data;
  }, []);

  const getDuplicateCandidates = useCallback(async () => {
    const response = await apiClient.get<SuccessResponse<DuplicateCandidate[]>>(
      "/actors/duplicate-candidates"
    );
    return response.data;
  }, []);

  return {
    actors: crud.data,
    archivedActors: crud.archivedData,
    total: crud.total,
    archivedTotal: crud.archivedTotal,
    processing: crud.processing,
    error: crud.error,
    getActors: crud.list,
    getArchivedActors: crud.listArchived,
    getActor: crud.get,
    createActor: crud.create,
    updateActor: crud.update,
    archiveActor: crud.archive,
    restoreActor: crud.restore,
    hardDeleteActor: crud.hardDelete,
    addActorRole: addRole,
    addActorAlias: addAlias,
    getDuplicateCandidates,
    mergeActors,
  };
};

export default useActors;
