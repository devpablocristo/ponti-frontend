export interface OrderInputDetail {
  input: string;
  consumption: string;
  category: string;
  dose: number;
  cost: number;
  unitPrice: number;
  total: number;
}

export type WorkOrderStatus = "draft" | "published";

export interface OrdersData {
  id: number;
  number: string;
  project_name: string;
  field_name: string;
  lot_name: string;
  date: string;
  crop_name: string;
  labor_name: string;
  labor_category_name: string;
  type_name: string;
  contractor: string;
  surface_ha: string;
  supply_name: string;
  consumption: string;
  category_name: string;
  dose: number | string;
  cost_per_ha: number | string;
  unit_price: number | string;
  total_cost: number | string;
  is_digital: boolean;
  status: WorkOrderStatus;
}

export interface InvestorSplit {
  investor_id: number;
  percentage: number;
}

export type WorkorderItem = {
  supply_id: number;
  total_used: number | string;
  final_dose: number | string;
};

export interface WorkorderData {
  id: number;
  number: string;
  project_id: number;
  field_id: number;
  lot_id: number;
  crop_id: number;
  labor_id: number;
  contractor: string;
  observations: string;
  date: string;
  investor_id: number;
  investor_splits?: InvestorSplit[];
  effective_area: number | string;
  items: WorkorderItem[];
  is_digital?: boolean;
  status?: WorkOrderStatus;
  published_work_order_id?: number | null;
  review_notes?: string;
}

export type Workorder = {
  number: string;
  project_id: number;
  field_id: number;
  lot_id: number;
  crop_id: number;
  labor_id: number;
  contractor: string;
  observations: string;
  date: string;
  investor_id: number;
  investor_splits?: InvestorSplit[];
  effective_area: number;
  items: {
    supply_id: number;
    total_used: number;
    final_dose: number;
  }[];
};

export type Metrics = {
  surface_ha: number;
  liters: number;
  kilograms: number;
  direct_cost: number;
  orders_count: number;
};
