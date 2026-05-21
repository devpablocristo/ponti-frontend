import { useCallback, useEffect } from "react";
import { ArrowUp, Hourglass, Upload, Wallet } from "lucide-react";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { usePDF } from "react-to-pdf";

import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import Button from "../../../components/Button/Button";
import ManagementBalanceTable from "./ManagementBalanceTable";
import { CostByCropTable } from "./CostByCropTable";
import OperationalIndicators from "./OperationalIndicators";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useDashboard from "../../../hooks/useDashboard";
import { DashboardData } from "../../../hooks/useDashboard/types";
import { formatNumberAr } from "../utils";
import { clearLocalStorage } from "../../../lib/authStorage";

interface DashboardIndicatorsProps {
  dashboard: DashboardData | null;
}

interface DashboardFilterSummaryItem {
  label: string;
  value: string;
}

function DashboardIndicators({ dashboard }: DashboardIndicatorsProps) {
  if (!dashboard) {
    return (
      <div className="flex gap-4">
        <div className="p-4 text-sm text-gray-600 rounded-lg bg-gray-50">
          No hay datos de dashboard disponibles
        </div>
      </div>
    );
  }

  const { metrics } = dashboard;
  const investorItems = metrics.investor_contributions.items ?? [];

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
          investorItems.length > 0
            ? investorItems
                .map((investor) => `${investor.contributions_progress_pct}%`)
                .join(" - ")
            : "0%"
        }
        subtext={
          investorItems.length > 0
            ? investorItems
                .map(
                  (investor) =>
                    `${investor.investor_name} ${investor.share_pct}%`
                )
                .join(" - ")
            : "Sin aportes cargados"
        }
        color="rose"
      />

      <IndicatorCard
        title="Renta (Rdo. Oper. / Total Activo.)"
        value={`${metrics.operating_result.margin_pct}%`}
        subtext={`u$${formatNumberAr(metrics.operating_result.result_usd)} / u$${formatNumberAr(metrics.operating_result.total_costs_usd)}`}
        icon={<Wallet className="w-4 h-4" />}
        color="black"
      />
    </div>
  );
}

function DashboardContent({
  dashboard,
  selectedFilters,
  includeFilters = false,
  className = "",
}: {
  dashboard: DashboardData | null;
  selectedFilters: DashboardFilterSummaryItem[];
  includeFilters?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {includeFilters && (
        <div className="my-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {selectedFilters.map((filter) => (
            <div
              key={filter.label}
              className="p-4 bg-white border rounded-xl"
            >
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                {filter.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {filter.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="my-3">
        <DashboardIndicators dashboard={dashboard} />
      </div>

      <div className="w-full py-3">
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

export function Dashboard() {
  const {
    filters,
    selectedCustomer,
    selectedProject,
    campaigns,
    projectId,
    selectedCampaignId,
    selectedField,
    hasWorkspaceSelection,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const { dashboard, processing, error, getDashboardInfo } = useDashboard();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `dashboard-${timestamp}.pdf`,
  });
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const hasActiveFilters = hasWorkspaceSelection;
  const selectedFilters = [
    {
      label: "Cliente",
      value: selectedCustomer?.name || "Todos los clientes",
    },
    {
      label: "Proyecto",
      value: selectedProject?.name || "Todos los proyectos",
    },
    {
      label: "Campaña",
      value: selectedCampaign?.name || "Todas las campañas",
    },
    {
      label: "Campo",
      value: selectedField?.name || "Todos los campos",
    },
  ];

  // Ultra-robust fallback: if the dashboard endpoint returns "invalid token"
  // (env switch / expired session), force a clean re-login.
  useEffect(() => {
    if (!error) return;
    const msg = String(error).toLowerCase();
    if (
      msg.includes("invalid token") ||
      msg.includes("sesión inválida") ||
      msg.includes("sesion invalida") ||
      msg.includes("jwt") ||
      msg.includes("expired")
    ) {
      clearLocalStorage();
      window.location.href = "/login";
    }
  }, [error]);

  const buildQueryParams = useCallback(() => {
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
  }, [selectedCustomer, projectId, selectedCampaignId, selectedField]);

  useEffect(() => {
    if (!hasActiveFilters) return;

    getDashboardInfo(buildQueryParams());
  }, [
    hasActiveFilters,
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
    getDashboardInfo,
    buildQueryParams,
  ]);

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar PDF",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: processing || !dashboard || !hasActiveFilters,
            onClick: toPDF,
          },
        ]}
      />

      {!hasActiveFilters && (
        <EmptyState
          className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white"
          title="Seleccioná filtros para ver el dashboard"
          description="El dashboard no carga datos globales automáticamente. Elegí cliente, proyecto, campaña o campo para consultar métricas."
        />
      )}

      {hasActiveFilters && processing && (
        <InlineSpinner size="lg" containerClassName="flex items-center justify-center h-20" />
      )}

      {hasActiveFilters && error && (
        <ErrorBanner className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>Error al cargar datos del dashboard: {error}</div>
            <Button
              variant="primary"
              size="sm"
              disabled={processing}
              onClick={() => getDashboardInfo(buildQueryParams())}
            >
              Reintentar
            </Button>
          </div>
        </ErrorBanner>
      )}

      {hasActiveFilters && (
        <DashboardContent dashboard={dashboard} selectedFilters={selectedFilters} />
      )}

      {hasActiveFilters && (
        <div className="fixed left-[-10000px] top-0">
        <div ref={targetRef} className="w-[1280px] p-6 bg-white">
          <DashboardContent
            dashboard={dashboard}
            selectedFilters={selectedFilters}
            includeFilters
          />
        </div>
        </div>
      )}
    </div>
  );
}
