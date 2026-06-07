// Cliente CRUDAR genérico de catálogos (no-actors). Habla con el BFF /catalog/<base>.
import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";

export interface CatalogItem {
  id: number;
  name?: string;
  [key: string]: unknown;
}

interface ListShape {
  data?: CatalogItem[];
  items?: CatalogItem[];
}

// listCatalog tolera respuestas {data:[]}, {items:[]} o un array crudo.
export async function listCatalog(base: string): Promise<CatalogItem[]> {
  const res = await apiClient.get<SuccessResponse<CatalogItem[] | ListShape>>(`/catalog/${base}`);
  const d = res.data as CatalogItem[] | ListShape | undefined;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

export async function createCatalog(base: string, body: Record<string, unknown>): Promise<void> {
  await apiClient.post(`/catalog/${base}`, body);
}

export async function updateCatalog(
  base: string,
  id: number,
  body: Record<string, unknown>,
): Promise<void> {
  await apiClient.put(`/catalog/${base}/${id}`, body);
}

export async function removeCatalog(base: string, id: number): Promise<void> {
  await apiClient.delete(`/catalog/${base}/${id}`);
}
