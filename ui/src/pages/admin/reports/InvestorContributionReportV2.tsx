import { useCallback, useEffect, useMemo } from "react";
import { LoaderCircle, SquareArrowOutUpRight, Layers, Tractor, Home, Settings } from "lucide-react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { usePDF } from "react-to-pdf";

import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useReporting from "../../../hooks/useReporting";
import { InvestorContributionReportData } from "../../../hooks/useReporting/types.ts";
import { formatNumberAr } from "../utils";

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

const CAT_COLORS = {
  inputs: "#10B981",
  labors: "#3B82F6",
  admin: "#9CA3AF",
  lease: "#8B5CF6",
};

function sumContributionKeys(data: InvestorContributionReportData, keys: string[]) {
  return data.contributions
    .filter((c) => keys.includes(c.key))
    .reduce((sum, c) => sum + (Number(c.total_usd) || 0), 0);
}

function aggregateInvestorAmounts(
  data: InvestorContributionReportData,
  keys: string[],
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
  const { filters, projectId, selectedCampaignId, loading } = useWorkspaceFilters([
    "project",
    "campaign",
  ]);

  const {
    investorContributionReportingData: data,
    processing,
    error,
    getInvestorContributionReportingData,
  } = useReporting();

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    return new URLSearchParams(params).toString();
  }, [projectId, selectedCampaignId]);

  useEffect(() => {
    getInvestorContributionReportingData(buildQueryParams());
  }, [buildQueryParams, getInvestorContributionReportingData]);

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

    const totalInputs = sumContributionKeys(data, [
      "agrochemicals",
      "fertilizers",
      "seeds",
    ]);
    const totalLabors = sumContributionKeys(data, [
      "general_labors",
      "sowing",
      "irrigation",
    ]);
    const totalAdmin = sumContributionKeys(data, ["administration_structure"]);
    const totalLease = sumContributionKeys(data, ["capitalizable_lease"]);

    const pct = (v: number) => (totalInvested > 0 ? (v / totalInvested) * 100 : 0);

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

    const donutSlices: DonutSlice[] = [
      { label: "Insumos", value: totalInputs, color: CAT_COLORS.inputs },
      { label: "Labores", value: totalLabors, color: CAT_COLORS.labors },
      {
        label: "Administración y estructura",
        value: totalAdmin,
        color: CAT_COLORS.admin,
      },
      { label: "Arriendo", value: totalLease, color: CAT_COLORS.lease },
    ].filter((s) => s.value > 0);

    const buildSlices = (keys: string[]) => {
      const map = aggregateInvestorAmounts(data, keys);
      return data.investor_headers.map((h) => ({
        investor_id: h.investor_id,
        name: h.investor_name,
        amount: map.get(h.investor_id) ?? 0,
        color: colorByInvestor[h.investor_id],
      }));
    };

    const categories: DistributionCategory[] = [
      {
        key: "inputs",
        label: "Insumos",
        icon: <Layers className="h-3.5 w-3.5" />,
        total: totalInputs,
        slices: buildSlices(["agrochemicals", "fertilizers", "seeds"]),
      },
      {
        key: "labors",
        label: "Labores",
        icon: <Tractor className="h-3.5 w-3.5" />,
        total: totalLabors,
        slices: buildSlices(["general_labors", "sowing", "irrigation"]),
      },
      {
        key: "admin",
        label: "Admin. y estructura",
        icon: <Settings className="h-3.5 w-3.5" />,
        total: totalAdmin,
        slices: buildSlices(["administration_structure"]),
      },
      {
        key: "lease",
        label: "Arriendo",
        icon: <Home className="h-3.5 w-3.5" />,
        total: totalLease,
        slices: buildSlices(["capitalizable_lease"]),
      },
    ].filter((c) => c.total > 0);

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
        totalInputs,
        inputsPct: pct(totalInputs),
        totalLabors,
        laborsPct: pct(totalLabors),
        adminStructure: totalAdmin,
        adminPct: pct(totalAdmin),
        investorsCount: data.investor_headers.length,
        agreedUsd,
      },
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
            disabled: processing,
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
          {data?.general && (
            <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
              <span>
                Superficie:{" "}
                <span className="font-semibold text-slate-700 tabular-nums">
                  {formatNumberAr(data.general.surface_total_ha)} Ha
                </span>
              </span>
              <span>
                Admin. proyecto / Ha:{" "}
                <span className="font-semibold text-slate-700 tabular-nums">
                  u$s {formatNumberAr(data.general.admin_per_ha_usd)}
                </span>
              </span>
            </div>
          )}

          <ReportKpiRow {...dashboard.kpi} />

          <InvestorShareRow investors={dashboard.investorShareItems} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
            <CostCompositionDonut
              slices={dashboard.donutSlices}
              total={dashboard.donutTotal}
            />
            <InvestorDistributionBars
              categories={dashboard.categories}
              legend={dashboard.legend}
            />
            <ContributionAdjustmentsList items={dashboard.adjustments} />
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
