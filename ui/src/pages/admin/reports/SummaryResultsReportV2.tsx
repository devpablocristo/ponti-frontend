import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SquareArrowOutUpRight,
  Wallet,
  Wheat,
  Layers,
  TrendingUp,
  Percent,
} from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { usePDF } from "react-to-pdf";

import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import SelectField from "../../../components/Input/SelectField";
import useReporting from "../../../hooks/useReporting";
import { formatNumberAr } from "../utils";

import { ReportKpiCard } from "./reportV2/ReportKpiCard";
import { IndicatorDot } from "./reportV2/IndicatorDot";
import { CropBadgeV2 } from "./reportV2/CropBadgeV2";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

function n(value: string | number | undefined | null): number {
  return Number(value) || 0;
}

export function SummaryResultsReportV2() {
  const [selectedCrop, setSelectedCrop] = useState<string>("0");

  const { filters, projectId, selectedCampaignId, loading } = useWorkspaceFilters([
    "project",
    "campaign",
  ]);

  const {
    summaryResultsReportingData: data,
    processing,
    error,
    getSummaryResultsReportingData,
  } = useReporting();

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    return new URLSearchParams(params).toString();
  }, [projectId, selectedCampaignId]);

  useEffect(() => {
    getSummaryResultsReportingData(buildQueryParams());
  }, [buildQueryParams, getSummaryResultsReportingData]);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `informe-resumen-resultados-${timestamp}.pdf`,
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    if (selectedCrop === "0") return data;
    return {
      ...data,
      crops: data.crops.filter((c) => c.crop_id.toString() === selectedCrop),
    };
  }, [data, selectedCrop]);

  return (
    <div className="relative">
      <LoadingOverlay show={loading.projects || loading.campaigns || processing} />

      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Generar Informe",
            variant: "primary",
            disabled: processing,
            onClick: () => getSummaryResultsReportingData(buildQueryParams()),
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
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!error && filtered && (
        <div ref={targetRef} className="space-y-4">
          <header className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2
                className="text-lg font-bold text-slate-900"
                style={{ fontFamily: SORA }}
              >
                Resumen de Resultados
              </h2>
              <p className="text-xs text-slate-500">
                Ingresos, costos y rentabilidad por cultivo
              </p>
            </div>
            <div className="w-56">
              <SelectField
                label="Cultivo"
                name="summaryView"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                options={
                  data
                    ? [
                        { id: 0, name: "Todos" },
                        ...data.crops.map((c) => ({
                          id: c.crop_id,
                          name: c.crop_name,
                        })),
                      ]
                    : []
                }
                size="sm"
                fullWidth
              />
            </div>
          </header>

          <KpiRow data={filtered.totals} />

          <section>
            <h3
              className="text-base font-bold text-slate-900 mb-3"
              style={{ fontFamily: SORA }}
            >
              Detalle por cultivo
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.crops.map((c) => (
                <CropCard key={c.crop_id} crop={c} />
              ))}
            </div>
          </section>

          <ComparativeStrip
            totals={filtered.totals}
            generalCrops={filtered.general_crops}
          />
        </div>
      )}

      {!error && !filtered && !processing && (
        <div className="p-4 text-sm text-slate-600 rounded-lg bg-slate-50">
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}

function KpiRow({ data }: { data: NonNullable<ReturnType<typeof useReporting>["summaryResultsReportingData"]>["totals"] }) {
  const invested = n(data.total_invested_project_usd);
  const netIncome = n(data.total_net_income_usd);
  const directCosts = n(data.total_direct_costs_usd);
  const operating = n(data.total_operating_result_usd);
  const returnPct = n(data.project_return_pct);

  const operatingPositive = operating >= 0;

  return (
    <div className="flex flex-wrap gap-3">
      <ReportKpiCard
        variant="hero"
        label="Total invertido"
        value={`u$s ${formatNumberAr(invested)}`}
        meta={`${formatNumberAr(n(data.total_surface_ha))} Ha`}
        icon={<Wallet className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="mint"
        label="Ingreso neto"
        value={`u$s ${formatNumberAr(netIncome)}`}
        meta="Total proyecto"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="sky"
        label="Costos directos"
        value={`u$s ${formatNumberAr(directCosts)}`}
        meta={
          netIncome > 0
            ? `${((directCosts / netIncome) * 100).toFixed(1)}% del ingreso`
            : "—"
        }
        icon={<Layers className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant={operatingPositive ? "mint" : "stone"}
        label="Resultado operativo"
        value={`${operatingPositive ? "" : "-"}u$s ${formatNumberAr(Math.abs(operating))}`}
        meta={operatingPositive ? "Utilidad" : "Pérdida"}
        icon={<Wheat className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="lavender"
        label="Rentabilidad"
        value={`${returnPct.toFixed(1)}%`}
        meta="Renta del proyecto"
        icon={<Percent className="h-5 w-5" />}
      />
    </div>
  );
}

function CropCard({
  crop,
}: {
  crop: NonNullable<ReturnType<typeof useReporting>["summaryResultsReportingData"]>["crops"][number];
}) {
  const operating = n(crop.operating_result_usd);
  const returnPct = n(crop.crop_return_pct);
  const invested = n(crop.total_invested_usd);
  const netIncome = n(crop.net_income_usd);
  const directCosts = n(crop.direct_costs_usd);
  const rent = n(crop.rent_usd);
  const structure = n(crop.structure_usd);

  return (
    <article
      className="rounded-2xl bg-white border border-slate-200/80 p-4 transition-all duration-200 hover:shadow-md"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CropBadgeV2 cropName={crop.crop_name} />
          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
            {formatNumberAr(n(crop.surface_ha))} Ha
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IndicatorDot value={returnPct} size="sm" />
          <span
            className="text-sm font-bold tabular-nums text-slate-900"
            style={{ fontFamily: SORA }}
          >
            {returnPct.toFixed(1)}%
          </span>
        </div>
      </header>

      <div
        className={`rounded-xl px-3 py-2.5 mb-3 ${operating >= 0 ? "bg-emerald-50" : "bg-red-50"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Resultado operativo
          </span>
          <span
            className={`text-base font-bold tabular-nums ${operating >= 0 ? "text-emerald-700" : "text-red-700"}`}
            style={{ fontFamily: SORA }}
          >
            {operating < 0 ? "-" : ""}u$s {formatNumberAr(Math.abs(operating))}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Row label="Ingreso neto" value={`u$s ${formatNumberAr(netIncome)}`} />
        <Row label="Costos directos" value={`u$s ${formatNumberAr(directCosts)}`} />
        <Row label="Arriendo" value={`u$s ${formatNumberAr(rent)}`} />
        <Row label="Estructura" value={`u$s ${formatNumberAr(structure)}`} />
        <Row
          label="Total activo"
          value={`u$s ${formatNumberAr(invested)}`}
          strong
        />
      </dl>
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right tabular-nums ${strong ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}
      >
        {value}
      </dd>
    </>
  );
}

function ComparativeStrip({
  totals,
  generalCrops,
}: {
  totals: NonNullable<ReturnType<typeof useReporting>["summaryResultsReportingData"]>["totals"];
  generalCrops: NonNullable<ReturnType<typeof useReporting>["summaryResultsReportingData"]>["general_crops"];
}) {
  return (
    <section
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-3">
        <h3
          className="text-base font-bold text-slate-900"
          style={{ fontFamily: SORA }}
        >
          Consolidado
        </h3>
        <p className="text-xs text-slate-500">
          Totales por campos vs. totales por cultivos
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <ComparativeCard title="Gral. Campos" data={totals} tone="primary" />
        <ComparativeCard
          title="Gral. Cultivos"
          data={generalCrops}
          tone="secondary"
        />
      </div>
    </section>
  );
}

type ConsolidatedShape = {
  total_surface_ha: string;
  total_net_income_usd: string;
  total_direct_costs_usd: string;
  total_rent_usd: string;
  total_structure_usd: string;
  total_invested_project_usd: string;
  total_operating_result_usd: string;
  project_return_pct: string;
};

function ComparativeCard({
  title,
  data,
  tone,
}: {
  title: string;
  data: ConsolidatedShape;
  tone: "primary" | "secondary";
}) {
  const bg = tone === "primary" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900";
  const labelColor = tone === "primary" ? "text-white/70" : "text-slate-500";
  const operating = n(data.total_operating_result_usd);
  const returnPct = n(data.project_return_pct);

  return (
    <div
      className={`rounded-xl p-4 ${bg}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
        <div className="flex items-center gap-2">
          <IndicatorDot value={returnPct} size="sm" />
          <span
            className="text-lg font-bold tabular-nums"
            style={{ fontFamily: SORA }}
          >
            {returnPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <ConsolidatedRow
          label="Superficie"
          value={`${data.total_surface_ha} Ha`}
          labelColor={labelColor}
        />
        <ConsolidatedRow
          label="Ingreso neto"
          value={`u$s ${formatNumberAr(data.total_net_income_usd)}`}
          labelColor={labelColor}
        />
        <ConsolidatedRow
          label="Costos directos"
          value={`u$s ${formatNumberAr(data.total_direct_costs_usd)}`}
          labelColor={labelColor}
        />
        <ConsolidatedRow
          label="Arriendo"
          value={`u$s ${formatNumberAr(data.total_rent_usd)}`}
          labelColor={labelColor}
        />
        <ConsolidatedRow
          label="Estructura"
          value={`u$s ${formatNumberAr(data.total_structure_usd)}`}
          labelColor={labelColor}
        />
        <ConsolidatedRow
          label="Total activo"
          value={`u$s ${formatNumberAr(data.total_invested_project_usd)}`}
          labelColor={labelColor}
          strong
        />
        <div className="col-span-2 mt-2 pt-2 border-t border-current/10 flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${labelColor}`}>
            Resultado operativo
          </span>
          <span
            className="text-base font-bold tabular-nums"
            style={{ fontFamily: SORA }}
          >
            {operating < 0 ? "-" : ""}u$s {formatNumberAr(Math.abs(operating))}
          </span>
        </div>
      </dl>
    </div>
  );
}

function ConsolidatedRow({
  label,
  value,
  labelColor,
  strong,
}: {
  label: string;
  value: string;
  labelColor: string;
  strong?: boolean;
}) {
  return (
    <>
      <dt className={labelColor}>{label}</dt>
      <dd
        className={`text-right tabular-nums ${strong ? "font-bold" : "font-medium opacity-90"}`}
      >
        {value}
      </dd>
    </>
  );
}

export default SummaryResultsReportV2;
