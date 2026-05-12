export interface DashboardData {
  metrics: Metrics;
  management_balance: ManagementBalance;
  crop_incidence: CropIncidence;
  operational_indicators: OperationalIndicators;
}

interface Metrics {
  sowing: SowingMetric;
  harvest: HarvestMetric;
  costs: CostsMetric;
  investor_contributions: InvestorContributions;
  operating_result: OperatingResultMetric;
}

interface SowingMetric {
  progress_pct: string;
  hectares: string;
  total_hectares: string;
}

interface HarvestMetric {
  progress_pct: string;
  hectares: string;
  total_hectares: string;
}

interface CostsMetric {
  progress_pct: string;
  executed_usd: string;
  budget_usd: string;
}

interface InvestorContributions {
  items: InvestorItem[];
}

interface InvestorItem {
  investor_id: number;
  investor_name: string;
  share_pct: string;
  contributions_progress_pct: string;
}

interface OperatingResultMetric {
  margin_pct: string;
  result_usd: string;
  total_costs_usd: string;
}

interface ManagementBalance {
  totals: BalanceTotals;
  items: BalanceItem[];
}

interface BalanceTotals {
  executed_usd: string;
  invested_usd: string;
  stock_usd: string;
}

interface BalanceItem {
  category: string;
  label: string;
  executed_usd: string;
  invested_usd: string;
  stock_usd?: string;
  order: number;
}

interface CropIncidence {
  items: CropItem[];
  total: CropTotal;
}

export interface CropItem {
  crop_id: number;
  name: string;
  hectares: string;
  cost_per_ha_usd: string;
  incidence_pct: string;
}

interface CropTotal {
  hectares: string;
  avg_cost_per_ha_usd: string;
}

interface OperationalIndicators {
  items: OperationalItem[];
}

export interface OperationalItem {
  type: string;
  title: string;
  date: string | null;
  workorder_id?: string;
}
