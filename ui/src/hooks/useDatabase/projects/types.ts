export type PageInfo = {
  page: number;
  per_page: number;
  max_page: number;
  total: number;
};

export type Project = {
  name: string;
  customer: Data;
  campaign: Data;
  managers: Data[];
  investors: {
    id: number | null;
    name: string;
    percentage: number;
  }[];
  admin_cost_investors: {
    id: number | null;
    name: string;
    percentage: number;
  }[];
  admin_cost: number;
  planned_cost: number;
  fields: Field[];
  updated_at: string | undefined;
};

type Data = {
  id: number | null;
  name: string;
};

export type Field = {
  id: number;
  name: string;
  lease_type_name?: string;
  lease_type_id: number;
  lease_type_percent: number | string | null;
  lease_type_value: number | string | null;
  investors: {
    id: number;
    name: string;
    percentage: number;
  }[];
  lots: Plot[];
};

export type Plot = {
  id: number;
  name: string;
  hectares: number;
  previous_crop_id: number;
  current_crop_id: number;
  current_crop_name?: string;
  previous_crop_name?: string;
  season: string;
};

export type ProjectPayload = {
  data: ProjectData[];
  page_info: PageInfo;
  total_hectares: number;
};

export type ProjectDropdownPayload = {
  data: ProjectDropdown[];
  page_info: PageInfo;
};

export type ProjectData = {
  id: number;
  name: string;
  customer: string;
  campaign: string;
  managers: string;
  investors: string;
  fields: FieldData[];
};

export type ProjectDropdown = {
  id: number;
  name: string;
  customerID: number;
  customerName: string;
};

type FieldData = {
  name: string;
  lease_type: string;
  hectares: string;
  crops: string;
};
