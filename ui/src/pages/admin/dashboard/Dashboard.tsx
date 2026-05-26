import { useCallback, useEffect } from "react";
import { ArrowUp, Hourglass, Upload, Wallet } from "lucide-react";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { Notification } from "../../../components/feedback/Notification";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { usePDF } from "react-to-pdf";

import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import Button from "../../../components/Button/Button";
import { useIsMobile } from "../../../hooks/useBreakpoint";
import { notify } from "../../../lib/notify";
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

interface DashboardFilterSummaryItem {
  label: string;
  value: string;
}

function DashboardIndicators({ dashboard }: DashboardIndicatorsProps) {
  if (!dashboard) {
    return (
      <div>
        <div className="p-4 text-sm text-gray-600 dark:text-gray-300 rounded-lg bg-gray-50 dark:bg-slate-900">
          No hay datos de dashboard disponibles
        </div>
      </div>
    );
  }

  const { metrics } = dashboard;
  const investorItems = metrics.investor_contributions.items ?? [];

  // Grid responsive: 1 col mobile, 2 cols sm, 3 cols lg, 5 cols xl.
  // El `flex gap-4` original overflowea horizontalmente con 5 KPIs en mobile.
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              className="p-4 bg-white dark:bg-slate-800 border rounded-xl"
            >
              <div className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                {filter.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
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

  const isMobile = useIsMobile();
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

  // El force-logout por sesión inválida vive ahora en el interceptor global
  // de `api/client.ts` + el listener de `auth:force-logout` en AuthProvider.
  // Acá no necesitamos heurística sobre el mensaje formateado.

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
            // El PDF tiene un layout fijo de 1280px (target landscape desktop).
            // En mobile genera un archivo cortado/ilegible — bloqueamos con un
            // toast en vez de exportar mal. Decisión cerrada del plan responsive.
            onClick: () => {
              if (isMobile) {
                notify.info("La exportación a PDF está disponible solo desde escritorio. El layout requiere al menos 1280px de ancho.");
                return;
              }
              toPDF();
            },
          },
        ]}
      />

      {!hasActiveFilters && (
        <EmptyState
          className="mt-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          title="Seleccioná filtros para ver el dashboard"
          description="El dashboard no carga datos globales automáticamente. Elegí cliente, proyecto, campaña o campo para consultar métricas."
        />
      )}

      {hasActiveFilters && processing && (
        <InlineSpinner size="lg" containerClassName="flex items-center justify-center h-20" />
      )}

      {hasActiveFilters && error && (
        // `error` ya viene formateado por useDashboard (formatError →
        // userMessage español). Lo mostramos en el banner inline porque acá
        // queremos la acción "Reintentar" pegada al mensaje — eso es feature
        // accionable que el toast no provee. NO concatenamos prefijos: el
        // texto del módulo ya describe la situación.
        <Notification variant="error" className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="primary"
              size="sm"
              disabled={processing}
              onClick={() => getDashboardInfo(buildQueryParams())}
            >
              Reintentar
            </Button>
          </div>
        </Notification>
      )}

      {hasActiveFilters && (
        <DashboardContent dashboard={dashboard} selectedFilters={selectedFilters} />
      )}

      {hasActiveFilters && (
        <div className="fixed left-[-10000px] top-0">
        <div ref={targetRef} className="w-[1280px] p-6 bg-white dark:bg-slate-800">
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
