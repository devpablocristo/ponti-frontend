import { useEffect } from "react";
import { ArrowUp, Hourglass, LoaderCircle, Wallet } from "lucide-react";

import FilterBar from "../../../layout/FilterBar/FilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import Button from "../../../components/Button/Button";
import ManagementBalanceTable from "./ManagementBalanceTable";
import { CostByCropTable } from "./CostByCropTable";
import OperationalIndicators from "./OperationalIndicators";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useDashboard from "../../../hooks/useDashboard";
import { DashboardData } from "../../../hooks/useDashboard/types";
import { formatNumberAr } from "../utils";

interface DashboardIndicatorsProps {
  dashboard: DashboardData | null;
}

function DashboardIndicators({ dashboard }: DashboardIndicatorsProps) {
  if (!dashboard) {
    return (
      <div className="flex gap-4">
        <div className="p-4 text-sm text-gray-600 rounded-lg bg-gray-50">
          No dashboard data available
        </div>
      </div>
    );
  }

  const { metrics } = dashboard;

  return (
    <div className="flex gap-4">
      <IndicatorCard
        title="Avance de siembra"
        value={`${metrics.sowing.progress_pct}%`}
        subtext={`${metrics.sowing.hectares} Has / ${metrics.sowing.total_hectares} Has`}
        icon={<ArrowUp className="w-4 h-4" />}
        color="blue"
      />

      <IndicatorCard
        title="Avance de costos"
        value={`${metrics.costs.progress_pct}%`}
        subtext={`u$${formatNumberAr(metrics.costs.executed_usd)} / u$${formatNumberAr(metrics.costs.budget_usd)}`}
        icon={<ArrowUp className="w-4 h-4" />}
        color="red"
      />

      <IndicatorCard
        title="Avance de cosecha"
        value={`${metrics.harvest.progress_pct}%`}
        subtext={`${metrics.harvest.hectares} / ${metrics.harvest.total_hectares} Has`}
        icon={<Hourglass className="w-4 h-4" />}
        color="blue"
      />

      <IndicatorCard
        title="Avance de aportes"
        value={
          metrics.investor_contributions.items
            ? metrics.investor_contributions.items
              .map((investor) => `${investor.contributions_progress_pct}%`)
              .join(" - ")
            : "N/A"
        }
        subtext={
          metrics.investor_contributions.items
            ? metrics.investor_contributions.items
              .map(
                (investor) =>
                  `${investor.investor_name} ${investor.share_pct}%`
              )
              .join(" - ")
            : "N/A"
        }
        color="purple"
      />

      <IndicatorCard
        title="Renta (Rdo. Oper. / Total Activo.)"
        value={`${metrics.operating_result.margin_pct}%`}
        subtext={`u$${formatNumberAr(metrics.operating_result.result_usd)} / u$${formatNumberAr(metrics.operating_result.total_costs_usd)}`}
        icon={<Wallet className="w-4 h-4" />}
        color="red"
      />
    </div>
  );
}

export function Dashboard() {
  const {
    filters,
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const { dashboard, processing, error, getDashboardInfo } = useDashboard();

  const buildQueryParams = () => {
    const params: Record<string, string> = {};

    if (selectedCustomer && selectedCustomer.id !== 0) {
      params.customer_id = String(selectedCustomer.id);
    }

    if (projectId) {
      params.project_id = String(projectId);
    }
    if (selectedCampaignId) {
      params.campaign_id = String(selectedCampaignId);
    }
    if (selectedField) {
      params.field_id = String(selectedField.id);
    }

    return new URLSearchParams(params).toString();
  };

  useEffect(() => {
    getDashboardInfo(buildQueryParams());
  }, [selectedCustomer, projectId, selectedCampaignId, selectedField]);

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Generar informe",
            variant: "outlineGreen",
            onClick: () => getDashboardInfo(buildQueryParams()),
          },
          {
            label: "Exportar PDF",
            variant: "success",
            isPrimary: true,
            disabled: true,
            onClick: () => {},
          },
        ]}
      />

      {processing && (
        <div className="flex items-center justify-center h-20">
          <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 my-4 text-sm text-red-800 rounded-lg bg-red-50">
          <div>Error loading dashboard data: {error}</div>
          <Button
            variant="outlineGray"
            size="sm"
            onClick={() => getDashboardInfo(buildQueryParams())}
          >
            Reintentar
          </Button>
        </div>
      )}

      <div className="my-4">
        <DashboardIndicators dashboard={dashboard} />
      </div>

      <div className="w-full p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <ManagementBalanceTable dashboard={dashboard} />
          </div>
          <div className="w-full md:w-1/2">
            <CostByCropTable dashboard={dashboard} />
          </div>
        </div>
      </div>

      <OperationalIndicators dashboard={dashboard} />
    </div>
  );
}