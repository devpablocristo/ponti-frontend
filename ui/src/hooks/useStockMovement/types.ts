import { PageInfo } from "../useDatabase/projects/types";

export interface StockMovementRequest {
  items: StockMovementItem[];
}

export interface StockMovementItem {
  quantity: number;
  movement_type: string;
  movement_date: Date;
  reference_number: string;
  project_destination_id: number;
  supply_id: number;
  investor_id: number;
  provider: Provider;
}

export interface Provider {
  id: number;
  name: string;
}

export interface Summary {
  total_kg: number;
  total_lt: number;
  total_usd: number;
}

export interface StockMovement {
  id: number;
  entry_type: string;
  reference_number: string;
  entry_date: string;
  investor_name: string;
  supply_name: string;
  quantity: string;
  category: string;
  type: string;
  provider_name: string;
  price_usd: number;
  total_usd: number;
}

export interface StockMovementResponse {
  summary: Summary;
  entries: StockMovement[];
  page_info: PageInfo;
}

export interface StockMovementResult {
  supply_movement_id: number;
  is_saved: boolean;
  error_detail: string;
}

export interface StockMovementCreationResponse {
  supply_movements: StockMovementResult[];
}
