// Cliente del registry (búsqueda unificada de entidades + edición de alias). Habla con el BFF
// /registry/* y reusa /actors/:id para cargar un actor completo. NO modifica los APIs existentes.
import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { Actor } from "@/api/actors";

export type RegistryEntityType = "actor" | "crops" | "types" | "lease-types" | "campaigns" | "project" | "field" | "lot";

export interface RegistryRow {
  entity_type: RegistryEntityType;
  id: number;
  name: string;
  tax?: string;
  roles: string[];
  archived: boolean;
}

export interface RegistryPageInfo {
  page: number;
  per_page: number;
  total: number;
  max_page: number;
}

export interface RegistryResult {
  data: RegistryRow[];
  page_info: RegistryPageInfo;
}

export type RegistryStatus = "active" | "archived" | "all";

// searchRegistry: búsqueda unificada paginada. type = "all" | rol de actor | base de catálogo.
export async function searchRegistry(params: {
  q?: string;
  type?: string;
  status?: RegistryStatus;
  page?: number;
  perPage?: number;
}): Promise<RegistryResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("per_page", String(params.perPage ?? 100));
  const res = await apiClient.get<SuccessResponse<RegistryResult>>(`/registry?${qs.toString()}`);
  return res.data ?? { data: [], page_info: { page: 1, per_page: 100, total: 0, max_page: 1 } };
}

export async function searchRegistryAll(params: {
  q?: string;
  type?: string;
  status?: RegistryStatus;
  perPage?: number;
}): Promise<RegistryRow[]> {
  const perPage = params.perPage ?? 200;
  const first = await searchRegistry({ ...params, page: 1, perPage });
  const all = [...first.data];
  const maxPage = first.page_info?.max_page ?? 1;
  for (let page = 2; page <= maxPage; page++) {
    const next = await searchRegistry({ ...params, page, perPage });
    all.push(...next.data);
  }
  return all;
}

// Caché a nivel módulo de las listas de opciones del registry por `base` (status active).
// Evita que cada CatalogNameSelect dispare su propio barrido full-paginado: N instancias de
// la misma base comparten UNA sola request en vuelo. Ante fallo se descarta para permitir
// reintento. invalidateRegistryOptions() la limpia tras create/archive para ver lo nuevo.
const registryOptionsCache = new Map<string, Promise<RegistryRow[]>>();

export function loadRegistryOptions(base: string): Promise<RegistryRow[]> {
  const cached = registryOptionsCache.get(base);
  if (cached) return cached;
  const p = searchRegistryAll({ type: base, status: "active" }).catch((err) => {
    registryOptionsCache.delete(base);
    throw err;
  });
  registryOptionsCache.set(base, p);
  return p;
}

export function invalidateRegistryOptions(base?: string): void {
  if (base) registryOptionsCache.delete(base);
  else registryOptionsCache.clear();
}

// getActor: carga un actor completo (keys incl. ALIAS, party_type, roles) para editar.
export async function getActor(id: number): Promise<Actor> {
  const res = await apiClient.get<SuccessResponse<Actor>>(`/actors/${id}`);
  return res.data;
}

// setActorAliases: reemplaza el set de alias del actor. 409 si un alias ya lo usa otra identidad.
export async function setActorAliases(id: number, aliases: string[]): Promise<void> {
  await apiClient.put(`/registry/actors/${id}/aliases`, { aliases });
}
