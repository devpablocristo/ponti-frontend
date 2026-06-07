// Cliente del Identity Gate (Pilar 3). Habla con el BFF /actors/* que proxea al core.
import { apiClient } from "@/api/client";
import { PageInfo, SuccessResponse } from "@/api/types";

export type ActorRole =
  | "customer"
  | "provider"
  | "investor"
  | "manager"
  | "contractor"
  | "biller"
  | "lessee";

export interface ActorKey {
  type: string; // TAX_ID | LEGAL_NAME | PERSON_NAME | ALIAS
  value: string;
}

export interface Actor {
  id: number;
  party_type: string; // org | person | unknown
  display_name: string;
  status: string;
  roles: string[];
  keys?: ActorKey[];
  archived_at?: string;
}

export interface ScoredActor extends Actor {
  score: number;
}

export interface ActorSearchResult {
  exact: Actor[];
  similar: ScoredActor[];
}

export interface ResolveActorResult {
  actor: Actor;
  reused: boolean;
  matched_key?: string;
}

export interface ResolveActorInput {
  name: string;
  tax_id?: string | null;
  role: ActorRole;
  allow_create?: boolean;
  // reject_existing: alta estricta — si ya existe (nombre o CUIT) devuelve 409 en vez de reusar.
  reject_existing?: boolean;
}

// searchActors: coincidencias exactas + similares (trigram). field "name" (default) o
// "tax_id" para buscar por CUIT.
export async function searchActors(
  q: string,
  field: "name" | "tax_id" = "name",
  limit = 20,
): Promise<ActorSearchResult> {
  const term = q.trim();
  if (term === "") return { exact: [], similar: [] };
  const res = await apiClient.get<SuccessResponse<ActorSearchResult>>(
    `/actors/search?q=${encodeURIComponent(term)}&field=${field}&limit=${limit}`,
  );
  return res.data ?? { exact: [], similar: [] };
}

// getActorByTaxID: lookup por CUIT/CUIL. Devuelve null si no existe (404).
export async function getActorByTaxID(taxID: string): Promise<Actor | null> {
  const t = taxID.trim();
  if (t === "") return null;
  try {
    const res = await apiClient.get<SuccessResponse<Actor>>(
      `/actors/by-tax-id?tax_id=${encodeURIComponent(t)}`,
    );
    return res.data ?? null;
  } catch {
    return null; // 404 = no existe (no es error)
  }
}

// resolveActor: resuelve-o-crea la identidad por la cascada CUIT→nombre. allow_create
// por defecto true (es el alta explícita "Crear nuevo"). reused indica si reusó una
// identidad existente.
export async function resolveActor(input: ResolveActorInput): Promise<ResolveActorResult> {
  const res = await apiClient.post<SuccessResponse<ResolveActorResult>>("/actors", {
    allow_create: true,
    ...input,
  });
  return res.data;
}

export interface ActorListResult {
  data: Actor[];
  page_info: PageInfo;
}

// listActors: listado paginado. status: active (default) | archived | all.
export async function listActors(
  status: "active" | "archived" | "all" = "active",
  page = 1,
  perPage = 50,
): Promise<ActorListResult> {
  const res = await apiClient.get<SuccessResponse<ActorListResult>>(
    `/actors?status=${status}&page=${page}&per_page=${perPage}`,
  );
  return res.data ?? { data: [], page_info: { per_page: perPage, page, max_page: 1, total: 0 } };
}

export async function updateActor(
  id: number,
  input: { display_name: string; party_type?: string },
): Promise<void> {
  await apiClient.put(`/actors/${id}`, input);
}

export async function archiveActor(id: number): Promise<void> {
  await apiClient.post(`/actors/${id}/archive`, {});
}

export async function restoreActor(id: number): Promise<void> {
  await apiClient.post(`/actors/${id}/restore`, {});
}

export async function deleteActor(id: number): Promise<void> {
  await apiClient.delete(`/actors/${id}`);
}

// setActorRoles reemplaza el conjunto de roles del actor.
export async function setActorRoles(id: number, roles: string[]): Promise<void> {
  await apiClient.put(`/actors/${id}/roles`, { roles });
}

// setActorTaxID corrige la clave fiscal (CUIT/DNI) de un actor existente, sin re-crearlo
// (el actor_id no cambia → lo colgado sigue igual). 409 si otra identidad activa ya la usa.
export async function setActorTaxID(id: number, taxId: string): Promise<void> {
  await apiClient.put(`/actors/${id}/tax-id`, { tax_id: taxId });
}
