import type { SuccessResponse } from "@/api/types";

/**
 * Tipos y constantes del preview del importador de supply movements.
 * Aislados del componente para reducir su peso. La lógica de parseo
 * vive en `importUtils.ts`; acá solo viven shapes y aliases.
 */

export const HEADER_ALIASES = {
  movementType: ["ingreso", "tipo_ingreso", "movement_type"],
  date: ["fecha", "date"],
  referenceNumber: [
    "remito",
    "numero",
    "nro",
    "n_remito",
    "nro_remito",
    "numero_remito",
    "numero_nombre",
    "numero_o_nombre",
    "nombre",
  ],
  provider: ["proveedor", "provider"],
  investor: ["inversor", "investor"],
  supply: ["insumo", "producto", "item"],
  quantity: ["cantidad", "qty", "cantidad_unidades"],

  // Movimiento interno (destino)
  destinationCustomer: [
    "cliente_destino",
    "cliente destino",
    "customer_destino",
    "customer_destination",
    "destino_cliente",
  ],
  destinationProject: [
    "proyecto_destino",
    "proyecto destino",
    "project_destino",
    "project_destination",
    "destino_proyecto",
  ],
  destinationCampaign: [
    "campana_destino",
    "campaña_destino",
    "campana destino",
    "campaña destino",
    "campaign_destino",
    "campaign_destination",
    "destino_campana",
    "destino_campaña",
  ],

  // Opcional: solo para validar contra el proyecto activo
  originProject: ["proyecto_origen", "proyecto origen", "project_origin", "origen_proyecto"],
} as const;

export const ALLOWED_MOVEMENT_TYPES = new Set([
  "Stock",
  "Movimiento interno",
  "Remito oficial",
]);

export type PreviewRow = {
  rowIndex: number;
  movementType: string;
  movementDate: string;
  referenceNumber: string;
  providerName: string;
  investorName: string;
  supplyName: string;
  quantity: string;

  originProjectName?: string;
  destinationCustomerName?: string;
  destinationProjectName?: string;
  destinationCampaignName?: string;

  providerId?: number;
  investorId?: number;
  supplyId?: number;
  destinationCustomerId?: number;
  destinationProjectId?: number;
  destinationCampaignId?: number;

  // `existing: true` cuando el remito + insumo (+ proyecto destino si es
  // movimiento interno) ya existe en el proyecto. El importador de archivos
  // nunca actualiza datos repetidos — la fila se marca amarilla, el checkbox
  // queda deshabilitado y no se envía en el submit.
  existing: boolean;
  errors: string[];
};

export type Filter = "all" | "ok" | "errors" | "existing";

export function statusOf(row: PreviewRow): "ok" | "error" | "existing" {
  if (row.existing) return "existing";
  if (row.errors.length > 0) return "error";
  return "ok";
}

// Entry shape mínima del BFF `/supply_movements/:projectId` para detectar
// duplicados. No tipamos todos los campos — solo los que importan para el
// match key.
export type ExistingMovementEntry = {
  reference_number?: string;
  supply_name?: string;
  entry_type?: string;
  destination_project_id?: number | null;
};

export type CustomerOption = {
  id: number;
  name: string;
};

export type ProjectOption = {
  id: number;
  name: string;
};

export type CampaignOption = {
  id: number;
  name: string;
  project_id?: number;
};

export type ApiCollectionResponse<T> =
  | T[]
  | SuccessResponse<T[]>
  | {
      data?: T[] | SuccessResponse<T[]>;
    };

export function extractCollection<T>(payload: ApiCollectionResponse<T> | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const firstLevel = payload.data;
  if (Array.isArray(firstLevel)) return firstLevel;
  if (firstLevel && Array.isArray(firstLevel.data)) return firstLevel.data;

  return [];
}
