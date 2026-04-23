import { useCallback, useEffect, useMemo } from "react";
import {
  FlaskConical,
  House,
  Leaf,
  LoaderCircle,
  Settings,
  Sprout,
  SquareArrowOutUpRight,
  Tractor,
  Wallet,
} from "lucide-react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { usePDF } from "react-to-pdf";

import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useReporting from "../../../hooks/useReporting";
import { InvestorContributionReportData } from "../../../hooks/useReporting/types.ts";
import { ReportKpiRow } from "./reportV2/ReportKpiRow";
import { InvestorShareRow, type InvestorShareItem } from "./reportV2/InvestorShareRow";
import { CostCompositionDonut, type DonutSlice } from "./reportV2/CostCompositionDonut";
import {
  InvestorDistributionBars,
  type DistributionCategory,
  type LegendItem,
} from "./reportV2/InvestorDistributionBars";
import {
  ContributionAdjustmentsList,
  type AdjustmentItem,
} from "./reportV2/ContributionAdjustmentsList";
import {
  HarvestPaymentStrip,
  type HarvestInvestor,
} from "./reportV2/HarvestPaymentStrip";
import { investorColorMap } from "./reportV2/lib/investorPalette";

const CATEGORY_CONFIG = [
  {
    key: "agro-inputs",
    label: "Agroquímicos / Fertilizantes",
    keys: ["agrochemicals", "fertilizers"],
    color: "#2563EB",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
  {
    key: "seeds",
    label: "Semilla",
    keys: ["seeds"],
    color: "#10B981",
    icon: <Leaf className="h-3.5 w-3.5" />,
  },
  {
    key: "sowing",
    label: "Siembra",
    keys: ["sowing"],
    color: "#9CA3AF",
    icon: <Sprout className="h-3.5 w-3.5" />,
  },
  {
    key: "general-labors",
    label: "Labores grales.",
    keys: ["general_labors", "irrigation"],
    color: "#34D399",
    icon: <Tractor className="h-3.5 w-3.5" />,
  },
  {
    key: "admin",
    label: "Administración y estructura",
    keys: ["administration_structure"],
    color: "#8B5CF6",
    icon: <Settings className="h-3.5 w-3.5" />,
  },
  {
    key: "lease",
    label: "Arriendo",
    keys: ["capitalizable_lease"],
    color: "#7C3AED",
    icon: <House className="h-3.5 w-3.5" />,
  },
] as const;

function sumContributionKeys(data: InvestorContributionReportData, keys: readonly string[]) {
  return data.contributions
    .filter((c) => keys.includes(c.key))
    .reduce((sum, c) => sum + (Number(c.total_usd) || 0), 0);
}

function aggregateInvestorAmounts(
  data: InvestorContributionReportData,
  keys: readonly string[],
): Map<number, number> {
  const result = new Map<number, number>();
  data.contributions
    .filter((c) => keys.includes(c.key))
    .forEach((c) => {
      c.investors.forEach((inv) => {
        const current = result.get(inv.investor_id) ?? 0;
        result.set(inv.investor_id, current + (Number(inv.amount_usd) || 0));
      });
    });
  return result;
}

export function InvestorContributionReportV2() {
  const {
    filters,
    projectId,
    selectedCampaignId,
    selectedCustomer,
    workspaceReady,
    loading,
  } = useWorkspaceFilters(["project", "campaign"]);

  const {
    investorContributionReportingData: data,
    processing,
    error,
    getInvestorContributionReportingData,
  } = useReporting();

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (selectedCustomer?.id) params.customer_id = String(selectedCustomer.id);
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    return new URLSearchParams(params).toString();
  }, [projectId, selectedCampaignId, selectedCustomer]);

  useEffect(() => {
    if (!workspaceReady) {
      getInvestorContributionReportingData("");
      return;
    }
    getInvestorContributionReportingData(buildQueryParams());
  }, [buildQueryParams, getInvestorContributionReportingData, workspaceReady]);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `informe-aporte-inversor-${timestamp}.pdf`,
  });

  const colorByInvestor = useMemo(
    () => (data ? investorColorMap(data.investor_headers) : {}),
    [data],
  );

  const dashboard = useMemo(() => {
    if (!data) return null;

    const totalInvested = data.pre_harvest.total_usd;
    const perHa = data.pre_harvest.total_us_ha;

    const agreedUsd = data.comparison.reduce(
      (sum, c) => sum + (Number(c.agreed_usd) || 0),
      0,
    );

    const investorShareItems: InvestorShareItem[] = data.investor_headers.map(
      (h) => {
        const preHarvestInv = data.pre_harvest.investors.find(
          (i) => i.investor_id === h.investor_id,
        );
        const comp = data.comparison.find((c) => c.investor_id === h.investor_id);
        return {
          investor_id: h.investor_id,
          name: h.investor_name,
          color: colorByInvestor[h.investor_id],
          contributed: Number(preHarvestInv?.amount_usd) || 0,
          sharePct: h.share_pct,
          adjustment: Number(comp?.adjustment_usd) || 0,
        };
      },
    );

    const buildSlices = (keys: readonly string[]) => {
      const map = aggregateInvestorAmounts(data, keys);
      return data.investor_headers.map((h) => ({
        investor_id: h.investor_id,
        name: h.investor_name,
        amount: map.get(h.investor_id) ?? 0,
        color: colorByInvestor[h.investor_id],
      }));
    };

    const categories: DistributionCategory[] = CATEGORY_CONFIG.map((category) => ({
      key: category.key,
      label: category.label,
      icon: category.icon,
      total: sumContributionKeys(data, [...category.keys]),
      color: category.color,
      slices: buildSlices(category.keys),
    })).filter((category) => category.total > 0);

    const donutSlices: DonutSlice[] = categories.map((category) => ({
      label: category.label,
      value: category.total,
      color: category.color,
    }));

    const legend: LegendItem[] = data.investor_headers.map((h) => ({
      investor_id: h.investor_id,
      name: h.investor_name,
      color: colorByInvestor[h.investor_id],
      sharePct: h.share_pct,
    }));

    const adjustments: AdjustmentItem[] = data.comparison.map((c) => ({
      investor_id: c.investor_id,
      name: c.investor_name,
      color: colorByInvestor[c.investor_id],
      amount: Number(c.adjustment_usd) || 0,
    }));

    const harvestTotal =
      data.harvest.rows.find((r) => r.key === "totals")?.total_usd ??
      data.harvest.rows.reduce((s, r) => s + (Number(r.total_usd) || 0), 0);
    const harvestPerHa =
      data.harvest.rows.find((r) => r.key === "totals")?.total_us_ha ?? 0;

    const harvestInvestors: HarvestInvestor[] = data.investor_headers.map((h) => {
      const amount =
        data.harvest.footer_payment_agreed.find(
          (i) => i.investor_id === h.investor_id,
        )?.amount_usd ?? 0;
      return {
        investor_id: h.investor_id,
        name: h.investor_name,
        color: colorByInvestor[h.investor_id],
        sharePct: h.share_pct,
        amount: Number(amount) || 0,
      };
    });

    const harvestAdjustment = data.harvest.footer_payment_adjustment.reduce(
      (s, i) => s + (Number(i.amount_usd) || 0),
      0,
    );

    return {
      kpi: {
        totalInvested,
        perHa,
        agreedUsd,
      },
      general: data.general,
      investorShareItems,
      donutSlices,
      donutTotal: totalInvested,
      categories,
      legend,
      adjustments,
      harvest: {
        total: Number(harvestTotal) || 0,
        perHa: Number(harvestPerHa) || 0,
        investors: harvestInvestors,
        adjustment: harvestAdjustment,
      },
    };
  }, [data, colorByInvestor]);

  return (
    <div className="relative">
      {(loading.projects || loading.campaigns || processing) && (
        <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
          <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      )}

      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Generar Informe",
            variant: "primary",
            disabled: processing || !workspaceReady,
            onClick: () => getInvestorContributionReportingData(buildQueryParams()),
          },
          {
            label: "Exportar Informe",
            variant: "primary",
            icon: <SquareArrowOutUpRight className="h-3.5 w-3.5 stroke-[3px]" />,
            disabled: processing,
            onClick: toPDF,
          },
        ]}
      />

      {error && (
        <div
          className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
          role="alert"
        >
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!error && dashboard && (
        <div ref={targetRef} className="space-y-4">
          <div className="flex flex-col gap-2 xl:h-[300px] xl:flex-row xl:items-stretch">
            <ReportKpiRow
              totalInvested={dashboard.kpi.totalInvested}
              perHa={dashboard.kpi.perHa}
              icon={<Wallet className="h-5 w-5" />}
            />
            <InvestorShareRow
              investors={dashboard.investorShareItems}
              surfaceTotalHa={dashboard.general.surface_total_ha}
              adminPerHaUsd={dashboard.general.admin_per_ha_usd}
            />
            <ContributionAdjustmentsList items={dashboard.adjustments} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.45fr)]">
            <CostCompositionDonut slices={dashboard.donutSlices} total={dashboard.donutTotal} />
            <InvestorDistributionBars categories={dashboard.categories} legend={dashboard.legend} />
          </div>

          <HarvestPaymentStrip
            total={dashboard.harvest.total}
            perHa={dashboard.harvest.perHa}
            investors={dashboard.harvest.investors}
            adjustment={dashboard.harvest.adjustment}
          />
        </div>
      )}

      {!error && !dashboard && !processing && (
        <div className="p-4 text-sm text-slate-600 rounded-lg bg-slate-50">
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}

export default InvestorContributionReportV2;
