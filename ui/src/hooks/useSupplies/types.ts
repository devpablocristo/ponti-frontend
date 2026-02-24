export interface SupplyData {
  ingreso: string;
  remito: string;
  fecha: string;
  inversor: string;
  insumo: string;
  cantidad: string;
  rubro: string;
  tipoClase: string;
  proveedor: string;
  precioUnidad: number;
  totalNeto: number;
}

export type SupplyCreatePayload = {
  name: string;
  unit: number;
  price: number;
  type: number;
  category: number;
  is_partial_price: boolean;
};

export type Supply = {
  id: number;
  name: string;
  price: string;
  is_partial_price?: boolean;
  unit_id?: number;
  unit_name?: string;
  type_name: string;
  category_name: string;
  category_id?: number;
  type_id?: number;
};

export type SupplyResponse = {
  data: Supply[];
};
