export type CustomerData = {
  id: number;
  name: string;
  actor_id?: number;
};

export type CustomerPayload = {
  data: CustomerData[];
  total: number;
};

export type CustomerPayloadInput = {
  name: string;
};
