import { PageInfo } from "../useDatabase/projects/types";

export type LotsData = {
  id: number;
  project_id: number;
  project_name: string;
  field_name: string;
  lot_name: string;
  previous_crop: string;
  previous_crop_id: number;
  current_crop: string;
  current_crop_id: number;
  variety: string;
  hectares: string;
  sowed_area: string;
  harvested_area: string | null;
  dates: LotDate[];
  tons: number | null;
  yield_tn_per_ha: number | null;
  income_net_per_ha: number | null;
  cost_usd_per_ha: number | null;
  rent_per_ha: number | null;
  admin_cost: number | null;
  active_total_per_ha: number | null;
  operating_result_per_ha: number | null;
  season: string;
  updated_at: string;
};

export type LotsDataUpdate = {
  id: number;
  field_id?: number;
  project_name?: string;
  name: string;
  previous_crop_id: number;
  current_crop_id: number;
  variety: string;
  hectares: string;
  dates?: LotDate[];
  season: string;
  updated_at: string;
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
  seeded_area: number;
  harvested_area: number;
  yield_tn_per_ha: number;
  cost_per_hectare: number;
  superficie_total: number;
};
