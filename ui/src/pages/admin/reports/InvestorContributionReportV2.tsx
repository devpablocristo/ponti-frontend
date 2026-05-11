import { useCallback, useEffect, useMemo } from "react";
import {
  FlaskConical,
  House,
  Leaf,
  Settings,
  Sprout,
  SquareArrowOutUpRight,
  Tractor,
  Wallet,
} from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { AppFilterBar as FilterBar } from "../../../components/filters/AppFilterBar";
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
  HarvestPaymentStrip,
  type HarvestInvestor,
} from "./reportV2/HarvestPaymentStrip";
import { investorColorMap } from "./reportV2/lib/investorPalette";

const CONTRIBUTION_TONES = [
  "#F05252",
  "#F98080",
  "#F8B4B4",
  "#FBD5D5",
  "#FCE8E8",
  "#FDF2F2",
] as const;

const CATEGORY_CONFIG = [
  {
    key: "agro-inputs",
    label: "Agroquímicos / Fertilizantes",
    keys: ["agrochemicals", "fertilizers"],
    color: CONTRIBUTION_TONES[0],
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
  {
    key: "seeds",
    label: "Semilla",
    keys: ["seeds"],
    color: CONTRIBUTION_TONES[1],
    icon: <Leaf className="h-3.5 w-3.5" />,
  },
  {
    key: "sowing",
    label: "Siembra",
    keys: ["sowing"],
    color: CONTRIBUTION_TONES[2],
    icon: <Sprout className="h-3.5 w-3.5" />,
  },
  {
    key: "general-labors",
    label: "Labores grales.",
    keys: ["general_labors", "irrigation"],
    color: CONTRIBUTION_TONES[3],
    icon: <Tractor className="h-3.5 w-3.5" />,
  },
  {
    key: "admin",
    label: "Administración y estructura",
    keys: ["administration_structure"],
    color: CONTRIBUTION_TONES[4],
    icon: <Settings className="h-3.5 w-3.5" />,
  },
  {
    key: "lease",
    label: "Arriendo",
    keys: ["capitalizable_lease"],
    color: CONTRIBUTION_TONES[5],
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
    const comparisonByInvestor = new Map(
      data.comparison.map((c) => [c.investor_id, c]),
    );

    const agreedUsd = data.comparison.reduce(
      (sum, c) => sum + (Number(c.agreed_usd) || 0),
      0,
    );

    const investorShareItems: InvestorShareItem[] = data.investor_headers.map(
      (h) => {
        const preHarvestInv = data.pre_harvest.investors.find(
          (i) => i.investor_id === h.investor_id,
        );
        const comp = comparisonByInvestor.get(h.investor_id);
        const contributed =
          Number(preHarvestInv?.amount_usd ?? comp?.actual_usd) || 0;
        const actualPct =
          totalInvested > 0 ? (contributed / totalInvested) * 100 : 0;
        const agreedPct = Number(comp?.agreed_share_pct ?? h.share_pct) || 0;
        return {
          investor_id: h.investor_id,
          name: h.investor_name,
          color: colorByInvestor[h.investor_id],
          contributed,
          actualPct,
          sharePct: agreedPct,
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
      sharePct:
        Number(
          comparisonByInvestor.get(h.investor_id)?.agreed_share_pct ??
            h.share_pct,
        ) || 0,
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
        sharePct:
          Number(
            comparisonByInvestor.get(h.investor_id)?.agreed_share_pct ??
              h.share_pct,
          ) || 0,
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
      <LoadingOverlay show={loading.projects || loading.campaigns || processing} />

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

      <ErrorBanner message={error} />

      {!error && dashboard && (
        <div ref={targetRef} className="space-y-4">
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[170px_minmax(0,1fr)] xl:items-stretch">
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
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.55fr)]">
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
