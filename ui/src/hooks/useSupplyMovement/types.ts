import { PageInfo, Provider, Summary } from "@/api/types";

export interface BatchFailure {
  index?: number;
  message?: string;
}

export interface BatchSupplyMovementError {
  error_detail?: string;
}

export interface BatchErrorPayload {
  error?: {
    details?: string;
    context?: {
      failures?: BatchFailure[];
      warnings?: string[];
      supply_movements?: BatchSupplyMovementError[];
    };
  };
  failures?: BatchFailure[];
  supply_movements?: BatchSupplyMovementError[];
  message?: string;
  warnings?: string[];
}

export interface SupplyMovementRequest {
  mode?: "strict" | "partial";
  items: SupplyMovementItem[];
}

export interface SupplyMovementItem {
  quantity: number;
  movement_type: string;
  movement_date: Date;
  reference_number: string;
  project_destination_id: number;
  supply_id: number;
  investor_id: number;
  provider: Provider;
}

export interface SupplyResponse {
  summary: Summary;
  entries: SupplyMovement[];
  page_info: PageInfo;
}

export interface SupplyMovement {
  id: number;
  entry_type: string;
  reference_number: string;
  entry_date: string;
  origin_project_id?: number | null;
  origin_project_name?: string | null;
  investor_name: string;
  supply_name: string;
  quantity: string;
  category: string;
  type: string;
  provider_name: string;
  price_usd: number;
  total_usd: number;
}
