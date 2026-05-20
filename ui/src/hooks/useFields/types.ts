export type Data = {
  id: number;
  name: string;
  project_id: number;
  lease_type_id?: number;
  lease_type_name?: string;
  lease_type_percent?: string | number | null;
  lease_type_value?: string | number | null;
  archived_at?: string | null;
};

export type FieldPayloadInput = {
  name: string;
  lease_type_id: number;
};

export type Payload = {
  data: Data[];
  total: number;
};
