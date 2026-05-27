import { useCallback, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { usePDF } from "react-to-pdf";

import { FilterBar } from "@/components/filters/AppFilterBar";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useDashboard from "../../../hooks/useDashboard";
import { clearLocalStorage } from "../../login/context/useLocalStorage";

import { DashboardKpiRow } from "./dashboardV2/DashboardKpiRow";
import { ManagementBalanceCardV2 } from "./dashboardV2/ManagementBalanceCardV2";
import { CostByCropCardV2 } from "./dashboardV2/CostByCropCardV2";
import { OperationalIndicatorsV2 } from "./dashboardV2/OperationalIndicatorsV2";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

export function DashboardV2() {
  const {
    filters,
    selectedCustomer,
    selectedProject,
    campaigns,
    projectId,
    selectedCampaignId,
    selectedField,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const { dashboard, processing, error, getDashboardInfo } = useDashboard();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `dashboard-${timestamp}.pdf`,
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const contextChips = [
    { label: "Cliente", value: selectedCustomer?.name || "Todos los clientes" },
    { label: "Proyecto", value: selectedProject?.name || "Todos los proyectos" },
    { label: "Campaña", value: selectedCampaign?.name || "Todas las campañas" },
    { label: "Campo", value: selectedField?.name || "Todos los campos" },
  ];

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
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    if (selectedField) params.field_id = String(selectedField.id);
    return new URLSearchParams(params).toString();
  }, [selectedCustomer, projectId, selectedCampaignId, selectedField]);

  useEffect(() => {
    const hasCustomer = Boolean(selectedCustomer && selectedCustomer.id !== 0);
    const hasProject = Boolean(projectId && projectId > 0);
    if (!hasCustomer || !hasProject) return;
    getDashboardInfo(buildQueryParams());
  }, [
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
    getDashboardInfo,
    buildQueryParams,
  ]);

  return (
    <div className="relative">
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Generar Informe",
            variant: "primary",
            onClick: () => getDashboardInfo(buildQueryParams()),
          },
          {
            label: "Exportar PDF",
            variant: "primary",
            isPrimary: true,
            disabled: processing || !dashboard,
            onClick: toPDF,
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
          <div>Error al cargar datos del dashboard: {error}</div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => getDashboardInfo(buildQueryParams())}
          >
            Reintentar
          </Button>
        </div>
      )}

      <DashboardV2Content dashboard={dashboard} contextChips={contextChips} />

      <div className="fixed left-[-10000px] top-0">
        <div ref={targetRef} className="w-[1280px] p-6 bg-white">
          <DashboardV2Content
            dashboard={dashboard}
            contextChips={contextChips}
            includeContext
          />
        </div>
      </div>
    </div>
  );
}

function DashboardV2Content({
  dashboard,
  contextChips,
  includeContext = false,
}: {
  dashboard: ReturnType<typeof useDashboard>["dashboard"];
  contextChips: { label: string; value: string }[];
  includeContext?: boolean;
}) {
  if (!dashboard) {
    return (
      <div className="p-4 my-4 text-sm text-slate-600 rounded-lg bg-slate-50">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {includeContext && (
        <div className="flex flex-wrap gap-2">
          {contextChips.map((chip) => (
            <div
              key={chip.label}
              className="rounded-xl bg-white border border-slate-200/80 px-3 py-2"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                style={{ fontFamily: SORA }}
              >
                {chip.label}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {chip.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <DashboardKpiRow dashboard={dashboard} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ManagementBalanceCardV2 dashboard={dashboard} />
        <CostByCropCardV2 dashboard={dashboard} />
      </div>

      <OperationalIndicatorsV2 dashboard={dashboard} />
    </div>
  );
}

export default DashboardV2;
