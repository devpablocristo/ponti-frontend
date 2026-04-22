export interface StockCountRequest {
  supply_id: number;
  counted_units: number;
  counted_at: Date;
  note?: string;
}

export interface StockCountResult {
  supply_id: number;
  is_saved: boolean;
  error_detail: string;
}
