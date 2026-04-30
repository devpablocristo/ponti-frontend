import { PageInfo } from "@/api/types";

export type DecimalString = string | null;

export type LotsData = {
  id: number;
  project_id: number;
  field_id: number;
  project_name: string;
  field_name: string;
  lot_name: string;
  previous_crop: string;
  previous_crop_id: number;
  current_crop: string;
  current_crop_id: number;
  variety: string;
  hectares: DecimalString;
  sowed_area: DecimalString;
  harvest_date?: string | null;
  harvested_area: DecimalString;
  dates: LotDate[];
  tons: DecimalString;
  yield_tn_per_ha: DecimalString;
  income_net_per_ha: DecimalString;
  cost_usd_per_ha: DecimalString;
  cost_per_hectare?: DecimalString;
  rent_per_ha: DecimalString;
  admin_cost: DecimalString;
  active_total_per_ha: DecimalString;
  operating_result_per_ha: DecimalString;
  season: string;
  updated_at?: string | null;
};

export type LotsDataUpdate = {
  id: number;
  field_id?: number;
  project_name?: string;
  field_name?: string;
  lot_name: string;
  previous_crop_id: number;
  current_crop_id: number;
  variety: string;
  sowed_area: string;
  dates?: LotDate[];
  season: string;
  updated_at?: string | null;
};

export type LotDate = {
  sowing_date: string;
  harvest_date: string | null;
  sequence: number;
};

export type Payload = {
  data: LotsData[];
  page_info: PageInfo;
};

export type Crop = {
  id: number;
  name: string;
};

export type LotKPIs = {
  seeded_area: string;
  harvested_area: string;
  yield_tn_per_ha: string;
  cost_per_hectare: string;
  superficie_total: string;
};
