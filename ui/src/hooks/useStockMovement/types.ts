import { Provider } from "@/api/types";

export interface StockMovementRequest {
  items: StockMovementItem[];
}

interface StockMovementItem {
  quantity: number;
  movement_type: string;
  movement_date: Date;
  reference_number: string;
  project_destination_id: number;
  supply_id: number;
  investor_id: number;
  provider: Provider;
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
