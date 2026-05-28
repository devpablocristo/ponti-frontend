import type { Project } from "../../../../hooks/useDatabase/projects/types";

/**
 * Tipos locales del CustomerEditor + sus components anidados.
 * No promovidos a `/api/types.ts` porque son shapes derivados de respuestas
 * específicas de los endpoints usados acá (algunos backwards-compat con
 * `archived_at`/`deleted_at` que no aplican fuera).
 */

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type ProjectListItem = {
  id: number;
  name: string;
  customer?: string;
  campaign?: string;
};

export type EntityOption = {
  id: number;
  name: string;
};

export type CampaignPayload = {
  data: EntityOption[];
  total: number;
};

export type FieldPayload = {
  data: Array<EntityOption & { project_id?: number }>;
  total: number;
};

export type EntityOptionsPayload =
  | EntityOption[]
  | { data?: EntityOption[]; items?: EntityOption[] };

export type FormOptionsPayload = {
  rentTypes?: EntityOptionsPayload;
};

export type LotListPayload = {
  data?: Array<{
    id: number;
    lot_name?: string;
    name?: string;
    field_id?: number;
  }>;
  items?: Array<{
    id: number;
    lot_name?: string;
    name?: string;
    field_id?: number;
  }>;
};

export type ProjectListResponse = {
  data?: ProjectListItem[];
  items?: ProjectListItem[];
};

export type ProjectDetailResponse = ApiResponse<Project>;

export type SelectionValue = number | "" | "new";

export type ActorOption = {
  id: number | string;
  name: string;
  roles?: string[];
  customer_id?: number | null;
};

export type ActorPayload = {
  data: Array<{
    id: number;
    display_name: string;
    roles?: string[];
    archived_at?: string | null;
    deleted_at?: string | null;
  }>;
  total: number;
};
