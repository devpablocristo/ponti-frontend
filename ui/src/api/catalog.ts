// Cliente CRUDAR genérico de catálogos (no-actors). Habla con el BFF /catalog/<base>.
import { apiClient } from "@/api/client";

export interface CatalogItem {
  id: number;
  name?: string;
  [key: string]: unknown;
}

// archiveCatalog / restoreCatalog: soft-delete y reactivación (BFF montado con { archive: true }).
export async function archiveCatalog(base: string, id: number): Promise<void> {
  await apiClient.post(`/catalog/${base}/${id}/archive`, {});
}

export async function restoreCatalog(base: string, id: number): Promise<void> {
  await apiClient.post(`/catalog/${base}/${id}/restore`, {});
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
