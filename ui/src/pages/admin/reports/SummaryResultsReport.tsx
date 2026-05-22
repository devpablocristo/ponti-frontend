import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Home,
  Layers,
  Percent,
  SquareArrowOutUpRight,
  TrendingUp,
  Wallet,
  Wheat,
} from "lucide-react";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { usePDF } from "react-to-pdf";

import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { notify } from "@/lib/notify";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useReporting from "../../../hooks/useReporting";
import type {
  FieldCropReportData,
  SummaryResultsReportData,
} from "../../../hooks/useReporting/types.ts";
import { formatNumberAr } from "../utils";
import { CropBadgeV2 } from "./reportV2/CropBadgeV2";
import { IndicatorDot } from "./reportV2/IndicatorDot";

type ReportTab = "executive" | "economic" | "integral";
type SummaryTotals = SummaryResultsReportData["totals"];
type SummaryCrop = SummaryResultsReportData["crops"][number];

const REPORT_FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";
const KPI_TYPOGRAPHY_DEFAULTS = {
  "--summary-kpi-label-size": "7.5px",
  "--summary-kpi-value-size": "16.64px",
  "--summary-kpi-meta-size": "10.24px",
} as CSSProperties;

const tabs: { id: ReportTab; label: string; icon: ReactNode }[] = [
  { id: "executive", label: "Ejecutivo", icon: <Home className="h-4 w-4" /> },
  { id: "economic", label: "Económico", icon: <Wallet className="h-4 w-4" /> },
  { id: "integral", label: "Integral", icon: <Layers className="h-4 w-4" /> },
];

const integralRows = [
  { key: "surface", label: "Superficie", unit: "Ha" },
  { key: "production", label: "Producción", unit: "Tn" },
  { key: "yield", label: "Rendimiento", unit: "Tn/Ha", strong: true },
  { key: "net_income", label: "Ingreso neto", unit: "u$s" },
  { key: "total_direct_costs", label: "Costos directos", unit: "u$s/Ha" },
  { key: "lease", label: "Arriendo", unit: "u$s/Ha" },
  { key: "admin", label: "Estructura", unit: "u$s/Ha" },
  { key: "total_invested", label: "Total activo", unit: "u$s/Ha", strong: true },
  {
    key: "operating_result",
    label: "Resultado operativo",
    unit: "u$s/Ha",
    strong: true,
    indicator: true,
  },
  { key: "return_pct", label: "Renta", unit: "%", strong: true, indicator: true },
];

type IntegralRow = (typeof integralRows)[number];

function n(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number | null | undefined): string {
  return `u$s ${formatNumberAr(n(value))}`;
}

function percent(value: string | number | null | undefined): string {
  return `${formatNumberAr(n(value))}%`;
}

function getFieldCropValue(data: FieldCropReportData, rowKey: string, columnId: string): number {
  const row = data.rows.find((entry) => entry.key === rowKey);
  return n(row?.values[columnId]?.number);
}

function cropIdFromUnknown(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim() || "0";

  if (value && typeof value === "object") {
    const maybeOption = value as {
      id?: unknown;
      value?: unknown;
      target?: { value?: unknown };
    };

    if (maybeOption.id !== undefined) return cropIdFromUnknown(maybeOption.id);
    if (maybeOption.value !== undefined) return cropIdFromUnknown(maybeOption.value);
    if (maybeOption.target?.value !== undefined) {
      return cropIdFromUnknown(maybeOption.target.value);
    }
  }

  return "0";
}

function useSharedKpiTypography(signature: string) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const maxSizes = { label: 7.5, value: 16.64, meta: 10.24 };
    const minSizes = { label: 5.5, value: 7, meta: 5.8 };

    const applySizes = (sizes: typeof maxSizes) => {
      const element = ref.current;
      if (!element) return;

      element.style.setProperty("--summary-kpi-label-size", `${sizes.label}px`);
      element.style.setProperty("--summary-kpi-value-size", `${sizes.value}px`);
      element.style.setProperty("--summary-kpi-meta-size", `${sizes.meta}px`);
    };

    const fitText = () => {
      const element = ref.current;
      if (!element) return;

      const sizes = { ...maxSizes };
      applySizes(sizes);

      for (let pass = 0; pass < 8; pass += 1) {
        let changed = false;

        (Object.keys(sizes) as Array<keyof typeof sizes>).forEach((type) => {
          const nodes = element.querySelectorAll<HTMLElement>(`[data-kpi-fit="${type}"]`);
          let scale = 1;

          nodes.forEach((node) => {
            if (node.clientWidth <= 0 || node.scrollWidth <= node.clientWidth) return;
            scale = Math.min(scale, (node.clientWidth / node.scrollWidth) * 0.98);
          });

          if (scale < 1) {
            const nextSize = Math.max(minSizes[type], sizes[type] * scale);
            if (nextSize < sizes[type]) {
              sizes[type] = nextSize;
              changed = true;
            }
          }
        });

        element.querySelectorAll<HTMLElement>("[data-kpi-fit-row='value']").forEach((node) => {
          if (node.clientWidth <= 0 || node.scrollWidth <= node.clientWidth) return;
          const scale = (node.clientWidth / node.scrollWidth) * 0.98;
          const nextSize = Math.max(minSizes.value, sizes.value * scale);
          if (nextSize < sizes.value) {
            sizes.value = nextSize;
            changed = true;
          }
        });

        applySizes(sizes);
        if (!changed) break;
      }
    };

    fitText();

    const element = ref.current;
    if (!element || typeof window === "undefined") return undefined;

    let frameId: number | null = null;
    const scheduleFit = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(fitText);
    };

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", scheduleFit);
      return () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", scheduleFit);
      };
    }

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [signature]);

  return ref;
}

export function SummaryResultsReport() {
  const [selectedCrop, setSelectedCrop] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<ReportTab>("executive");

  const { filters, projectId, selectedCustomer, selectedCampaignId, workspaceReady, loading } =
    useWorkspaceFilters(["project", "campaign"]);

  const {
    summaryResultsReportingData: data,
    processing: summaryProcessing,
    error: summaryError,
    getSummaryResultsReportingData,
  } = useReporting();
  const {
    fieldCropReportingData: fieldCropData,
    processing: fieldCropProcessing,
    error: fieldCropError,
    getFieldCropReportingData,
  } = useReporting();

  useEffect(() => {
    if (summaryError) notify.error(summaryError);
  }, [summaryError]);
  useEffect(() => {
    if (fieldCropError) notify.error(fieldCropError);
  }, [fieldCropError]);

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};

    if (selectedCustomer?.id) params.customer_id = String(selectedCustomer.id);
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);

    return new URLSearchParams(params).toString();
  }, [projectId, selectedCampaignId, selectedCustomer]);

  const loadReports = useCallback(() => {
    if (!workspaceReady) {
      getSummaryResultsReportingData("");
      getFieldCropReportingData("");
      return;
    }

    const query = buildQueryParams();
    getSummaryResultsReportingData(query);
    getFieldCropReportingData(query);
  }, [buildQueryParams, getFieldCropReportingData, getSummaryResultsReportingData, workspaceReady]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!data || selectedCrop === "0") return;
    const cropExists = data.crops.some((crop) => crop.crop_id.toString() === selectedCrop);
    if (!cropExists) {
      setSelectedCrop("0");
    }
  }, [data, selectedCrop]);

  const selectedCrops = useMemo(() => {
    if (!data) return [];
    if (selectedCrop === "0") return data.crops;
    const crops = data.crops.filter((crop) => crop.crop_id.toString() === selectedCrop);
    return crops.length > 0 ? crops : data.crops;
  }, [data, selectedCrop]);

  const filteredFieldCropData = useMemo(() => {
    if (!fieldCropData) return null;
    if (selectedCrop === "0") return fieldCropData;

    const columns = fieldCropData.columns.filter(
      (column) => column.crop_id.toString() === selectedCrop
    );

    if (columns.length === 0) return fieldCropData;

    return {
      ...fieldCropData,
      columns,
    };
  }, [fieldCropData, selectedCrop]);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `informe-resumen-resultados-${timestamp}.pdf`,
  });

  const reportFilters = useMemo(
    () => [
      ...filters,
      {
        type: "select" as const,
        name: "cultivo",
        label: "Cultivo",
        placeholder: "Todos",
        options: data
          ? [
              { id: 0, name: "Todos" },
              ...data.crops.map((crop) => ({
                id: crop.crop_id,
                name: crop.crop_name,
              })),
            ]
          : [{ id: 0, name: "Todos" }],
        value: Number(selectedCrop),
        onChange: (value: unknown) => setSelectedCrop(cropIdFromUnknown(value)),
        setData: (value: unknown) => setSelectedCrop(cropIdFromUnknown(value)),
        disabled: !data || data.crops.length === 0,
      },
    ],
    [data, filters, selectedCrop]
  );

  const isLoading =
    loading.customers ||
    loading.projects ||
    loading.campaigns ||
    summaryProcessing ||
    fieldCropProcessing;

  return (
    <div className="relative">
      <LoadingOverlay show={isLoading} />

      <AppFilterBar
        filters={reportFilters}
        actions={[
          {
            label: "Generar Informe",
            variant: "primary",
            disabled: summaryProcessing || !workspaceReady,
            onClick: loadReports,
          },
          {
            label: "Exportar PDF",
            variant: "primary",
            icon: <SquareArrowOutUpRight className="h-3.5 w-3.5 stroke-[3px]" />,
            disabled: summaryProcessing || !data,
            onClick: toPDF,
          },
        ]}
      />


      {!summaryError && data && (
        <div
          ref={targetRef}
          className="space-y-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-slate-100 shadow-sm"
          style={{ fontFamily: REPORT_FONT }}
        >
          <ReportHeader activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "executive" && (
            <ExecutiveView totals={data.totals} crops={selectedCrops} />
          )}

          {activeTab === "economic" && <EconomicView totals={data.totals} crops={selectedCrops} />}

          {activeTab === "integral" && (
            <IntegralView data={filteredFieldCropData} error={fieldCropError} />
          )}
        </div>
      )}

      {!summaryError && !data && !summaryProcessing && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-300">
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}

function ReportHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: ReportTab;
  onTabChange: (value: ReportTab) => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[1.05rem] font-semibold text-slate-950">Resumen de Resultados</h2>
        <p className="mt-0.5 text-[0.72rem] text-slate-500 dark:text-slate-400">
          Visión general del desempeño económico del proyecto.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[0.72rem] font-semibold text-slate-600 dark:text-slate-300">Vista</span>
        <div className="grid grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "flex min-h-9 min-w-[132px] items-center justify-center gap-2 rounded-md px-4 text-[0.72rem] font-semibold transition-colors",
                  selected
                    ? "bg-[#174B78] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 hover:text-slate-900 dark:text-slate-100",
                ].join(" ")}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function ExecutiveView({ totals, crops }: { totals: SummaryTotals; crops: SummaryCrop[] }) {
  return (
    <div className="space-y-5">
      <KpiGrid totals={totals} />
      <CropResults crops={crops} />
      <GeneralSummary totals={totals} />
    </div>
  );
}

function KpiGrid({ totals }: { totals: SummaryTotals }) {
  const surface = n(totals.total_surface_ha);
  const netIncome = n(totals.total_net_income_usd);
  const totalActive = n(totals.total_invested_project_usd);
  const operating = n(totals.total_operating_result_usd);
  const returnPct = n(totals.project_return_pct);
  const cards = [
    {
      label: "Superficie Total",
      value: `${formatNumberAr(surface)} Has`,
      meta: "100% del proyecto",
      icon: <Wheat className="h-[18px] w-[18px]" />,
      tone: "surface" as const,
    },
    {
      label: "Ingreso Neto",
      value: money(netIncome),
      meta: `${formatNumberAr(surface > 0 ? netIncome / surface : 0)} u$ / ha`,
      icon: <TrendingUp className="h-[18px] w-[18px]" />,
      tone: "income" as const,
    },
    {
      label: "Total Activo",
      value: money(totalActive),
      meta: `${formatNumberAr(surface > 0 ? totalActive / surface : 0)} u$ / ha`,
      icon: <Layers className="h-[18px] w-[18px]" />,
      tone: "active" as const,
    },
    {
      label: "Resultado Operativo",
      value: `${operating < 0 ? "-" : ""}${money(Math.abs(operating))}`,
      meta: `${operating < 0 ? "-" : ""}${formatNumberAr(
        surface > 0 ? Math.abs(operating) / surface : 0
      )} u$ / ha`,
      icon: <Wallet className="h-[18px] w-[18px]" />,
      tone: "operating" as const,
      badge: operating >= 0 ? "Positivo" : "Negativo",
    },
    {
      label: "Renta del Proyecto",
      value: percent(returnPct),
      meta: "Sobre total activo",
      icon: <Percent className="h-[18px] w-[18px]" />,
      tone: "rent" as const,
      indicatorValue: returnPct,
    },
  ];
  const typographyRef = useSharedKpiTypography(
    JSON.stringify(cards.map(({ label, value, meta, badge }) => [label, value, meta, badge ?? ""]))
  );

  return (
    <section
      ref={typographyRef}
      className="grid gap-2.5 overflow-x-auto [grid-template-columns:minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,1.24fr)_minmax(0,1fr)]"
      style={KPI_TYPOGRAPHY_DEFAULTS}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  );
}

function KpiCard({
  label,
  value,
  meta,
  icon,
  tone,
  badge,
  indicatorValue,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: ReactNode;
  tone: "surface" | "income" | "active" | "operating" | "rent";
  badge?: string;
  indicatorValue?: number;
}) {
  const isOperating = tone === "operating";
  const iconTone = {
    surface: "bg-[#E7EEF9] text-[#4677B8]",
    income: "bg-[#DDF7E9] text-[#159260]",
    active: "bg-[#FBE7DA] text-[#C86C1C]",
    operating: "bg-white/15 text-white",
    rent: "bg-[#FDE4EA] text-[#D43E5F]",
  }[tone];

  return (
    <article
      className={
        isOperating
          ? "min-w-0 rounded-xl bg-[#174B78] px-3 py-4 text-white shadow-sm"
          : "min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-4 shadow-sm"
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconTone}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 items-center gap-1">
            <span
              data-kpi-fit="label"
              className={
                isOperating
                  ? "block min-w-0 overflow-hidden whitespace-nowrap font-medium uppercase tracking-wide text-white/85"
                  : "block min-w-0 overflow-hidden whitespace-nowrap font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
              }
              style={{ fontSize: "var(--summary-kpi-label-size)" }}
            >
              {label}
            </span>
          </div>
          <div
            data-kpi-fit-row="value"
            className="mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap"
          >
            <span
              data-kpi-fit="value"
              className="block min-w-0 overflow-hidden whitespace-nowrap font-semibold leading-none tabular-nums"
              style={{ fontFamily: SORA, fontSize: "var(--summary-kpi-value-size)" }}
            >
              {value}
            </span>
            {badge && (
              <span
                data-kpi-fit="label"
                className="shrink-0 rounded-full bg-[#B05A73] px-1.5 py-0.5 font-semibold text-white shadow-sm"
                style={{ fontSize: "var(--summary-kpi-label-size)" }}
              >
                {badge}
              </span>
            )}
          </div>
          {meta && (
            <span
              data-kpi-fit="meta"
              className={
                isOperating
                  ? "mt-2 block min-w-0 overflow-hidden whitespace-nowrap font-semibold text-white/85"
                  : "mt-2 block min-w-0 overflow-hidden whitespace-nowrap font-semibold text-slate-500 dark:text-slate-400"
              }
              style={{ fontSize: "var(--summary-kpi-meta-size)" }}
            >
              {meta}
            </span>
          )}
        </div>
        {indicatorValue !== undefined && <IndicatorDot value={indicatorValue} size="sm" />}
      </div>
    </article>
  );
}

function CropResults({ crops }: { crops: SummaryCrop[] }) {
  if (crops.length === 0) {
    return (
      <section className="rounded-lg bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
        No hay cultivos para el filtro seleccionado
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[1.05rem] font-semibold text-slate-950">Resultados por Cultivo</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {crops.map((crop) => (
          <CropCard key={crop.crop_id} crop={crop} />
        ))}
      </div>
    </section>
  );
}

function CropCard({ crop }: { crop: SummaryCrop }) {
  const operating = n(crop.operating_result_usd);
  const returnPct = n(crop.crop_return_pct);

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 max-w-[65%]">
          <CropBadgeV2 cropName={crop.crop_name} />
        </div>
        <div className="text-right">
          <p className="text-[0.78rem] font-semibold tabular-nums text-slate-950">
            {formatNumberAr(crop.surface_ha)} Has
          </p>
          <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">del total</p>
        </div>
      </header>

      <dl className="space-y-3 text-[0.78rem]">
        <MetricLine label="Ingreso Neto" value={money(crop.net_income_usd)} />
        <MetricLine label="Costos Directos" value={money(crop.direct_costs_usd)} />
        <MetricLine label="Arriendo" value={money(crop.rent_usd)} />
        <MetricLine label="Estructura" value={money(crop.structure_usd)} />
        <MetricLine
          label="Total Activo"
          value={money(crop.total_invested_usd)}
          className="rounded-md bg-[#FBD5D5] px-3 py-2 font-semibold text-slate-950"
        />
        <MetricLine
          label="Resultado Operativo"
          value={`${operating < 0 ? "-" : ""}${money(Math.abs(operating))}`}
          indicator={operating}
          className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white"
        />
        <MetricLine label="Renta del cultivo" value={percent(returnPct)} indicator={returnPct} />
      </dl>
    </article>
  );
}

function MetricLine({
  label,
  value,
  className,
  indicator,
}: {
  label: string;
  value: string;
  className?: string;
  indicator?: number;
}) {
  return (
    <div className={className ?? "px-3"}>
      <div className="flex items-center justify-between gap-3">
        <dt
          className={
            className?.includes("bg-slate")
              ? "text-[9px] font-medium text-white"
              : "text-[9px] font-medium text-slate-600 dark:text-slate-300"
          }
        >
          {label}
        </dt>
        <dd className="flex items-center gap-2 text-right text-[0.78rem] font-semibold tabular-nums">
          <span>{value}</span>
          {indicator !== undefined && <IndicatorDot value={indicator} size="sm" />}
        </dd>
      </div>
    </div>
  );
}

function GeneralSummary({ totals }: { totals: SummaryTotals }) {
  const surface = n(totals.total_surface_ha);
  const direct = n(totals.total_direct_costs_usd);
  const rent = n(totals.total_rent_usd);
  const structure = n(totals.total_structure_usd);
  const active = n(totals.total_invested_project_usd);
  const operating = n(totals.total_operating_result_usd);
  const returnPct = n(totals.project_return_pct);

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <h3 className="text-[1.05rem] font-semibold text-slate-950">
        Resumen General{" "}
        <span className="text-[0.72rem] font-semibold text-slate-500 dark:text-slate-400">(Totales del proyecto)</span>
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryItem
          icon={<Layers className="h-5 w-5" />}
          label="Costos Directos"
          value={money(direct)}
          meta={`${formatNumberAr(surface > 0 ? direct / surface : 0)} u$ / ha`}
        />
        <SummaryItem
          icon={<Home className="h-5 w-5" />}
          label="Arriendo Total"
          value={money(rent)}
          meta={`${formatNumberAr(surface > 0 ? rent / surface : 0)} u$ / ha`}
        />
        <SummaryItem
          icon={<Wallet className="h-5 w-5" />}
          label="Estructura"
          value={money(structure)}
          meta={`${formatNumberAr(surface > 0 ? structure / surface : 0)} u$ / ha`}
        />
        <SummaryItem
          icon={<Wheat className="h-5 w-5" />}
          label="Total Invertido (Activo)"
          value={money(active)}
          meta={`${formatNumberAr(surface > 0 ? active / surface : 0)} u$ / ha`}
        />
        <SummaryItem
          icon={<TrendingUp className="h-5 w-5" />}
          label="Resultado Operativo"
          value={`${operating < 0 ? "-" : ""}${money(Math.abs(operating))}`}
          meta={`${operating < 0 ? "-" : ""}${formatNumberAr(
            surface > 0 ? Math.abs(operating) / surface : 0
          )} u$ / ha`}
          tone="pink"
        />
        <SummaryItem
          icon={<Percent className="h-5 w-5" />}
          label="Renta del Proyecto"
          value={percent(returnPct)}
          indicator={returnPct}
          tone="pink"
        />
      </div>
    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  meta,
  indicator,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  meta?: string;
  indicator?: number;
  tone?: "neutral" | "pink";
}) {
  return (
    <article className="flex min-w-0 items-center gap-3 border-slate-200 dark:border-slate-700 xl:border-r xl:pr-4 xl:last:border-r-0">
      <span
        className={
          tone === "pink"
            ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FDE4EA] text-[#D43E5F]"
            : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="truncate text-[0.78rem] font-semibold leading-tight tabular-nums text-slate-950">
            {value}
          </p>
          {indicator !== undefined && <IndicatorDot value={indicator} size="sm" />}
        </div>
        {meta && <p className="mt-1 text-[0.72rem] font-semibold text-slate-500 dark:text-slate-400">{meta}</p>}
      </div>
    </article>
  );
}

function EconomicView({ totals, crops }: { totals: SummaryTotals; crops: SummaryCrop[] }) {
  const activeTotal = n(totals.total_invested_project_usd);
  const costItems = [
    { label: "Costos Directos", value: n(totals.total_direct_costs_usd), tone: "bg-[#DCEAF3]" },
    { label: "Arriendo", value: n(totals.total_rent_usd), tone: "bg-[#F9E8B5]" },
    { label: "Estructura", value: n(totals.total_structure_usd), tone: "bg-[#DDF2D8]" },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <h3 className="mb-4 text-[1.05rem] font-semibold text-slate-950">
            Composición del Activo
          </h3>
          <div className="space-y-3">
            {costItems.map((item) => {
              const pct = activeTotal > 0 ? (item.value / activeTotal) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {item.label}
                    </span>
                    <span className="text-[0.78rem] font-semibold tabular-nums text-slate-950">
                      {money(item.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${item.tone}`}
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl bg-[#174B78] p-4 text-white shadow-sm">
          <h3 className="mb-4 text-[1.05rem] font-semibold">Resultado Económico</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <EconomicMetric label="Ingreso Neto" value={money(totals.total_net_income_usd)} />
            <EconomicMetric label="Total Activo" value={money(totals.total_invested_project_usd)} />
            <EconomicMetric
              label="Resultado Operativo"
              value={money(totals.total_operating_result_usd)}
            />
            <EconomicMetric label="Renta del Proyecto" value={percent(totals.project_return_pct)} />
          </div>
        </article>
      </section>

      <CropEconomicsTable crops={crops} />
    </div>
  );
}

function EconomicMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-3">
      <p className="text-[9px] font-medium uppercase tracking-wide text-white/65">{label}</p>
      <p
        className="mt-2 truncate text-[1.04rem] font-semibold leading-none tabular-nums"
        style={{ fontFamily: SORA }}
      >
        {value}
      </p>
    </div>
  );
}

function CropEconomicsTable({ crops }: { crops: SummaryCrop[] }) {
  if (crops.length === 0) {
    return (
      <section className="rounded-xl bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
        No hay cultivos para el filtro seleccionado
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h3 className="text-[1.05rem] font-semibold text-slate-950">
          Resultados Económicos por Cultivo
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[0.78rem]">
          <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Cultivo</th>
              <th className="px-4 py-3 text-right">Ingreso Neto</th>
              <th className="px-4 py-3 text-right">Costos Directos</th>
              <th className="px-4 py-3 text-right">Arriendo</th>
              <th className="px-4 py-3 text-right">Estructura</th>
              <th className="px-4 py-3 text-right">Total Activo</th>
              <th className="px-4 py-3 text-right">Renta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {crops.map((crop) => (
              <tr key={crop.crop_id} className="align-middle">
                <td className="px-4 py-3">
                  <CropBadgeV2 cropName={crop.crop_name} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {money(crop.net_income_usd)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {money(crop.direct_costs_usd)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {money(crop.rent_usd)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {money(crop.structure_usd)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex rounded-md bg-[#FBD5D5] px-2 py-1 font-semibold tabular-nums text-slate-950">
                    {money(crop.total_invested_usd)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-2 font-semibold tabular-nums">
                    {percent(crop.crop_return_pct)}
                    <IndicatorDot value={n(crop.crop_return_pct)} size="sm" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function integralMetricCellClass(row: IntegralRow, index: number) {
  const base = "sticky left-0 px-4 py-3 text-left text-[0.78rem]";

  if (row.key === "operating_result") {
    return `${base} bg-slate-950 font-semibold text-white`;
  }

  if (row.key === "total_invested") {
    return `${base} bg-[#FBD5D5] font-semibold text-slate-950`;
  }

  if (row.key === "return_pct") {
    return `${base} bg-[#FDE4EA] font-semibold text-slate-950`;
  }

  return `${base} ${index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900"} font-medium text-slate-600`;
}

function integralValueCellClass(row: IntegralRow, index: number) {
  const base = "px-4 py-3 text-center";

  if (row.key === "operating_result") return `${base} bg-slate-950 text-white`;
  if (row.key === "total_invested") return `${base} bg-[#FBD5D5] text-slate-950`;
  if (row.key === "return_pct") return `${base} bg-[#FDE4EA] text-slate-950`;

  return `${base} ${index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/50"}`;
}

function IntegralView({ data, error }: { data: FieldCropReportData | null; error: string | null }) {
  if (error) {
    // El error ya se publica al toast desde el parent; acá solo evitamos
    // renderizar el árbol de datos.
    return null;
  }

  if (!data) {
    return (
      <section className="rounded-xl bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
        No hay datos integrales disponibles
      </section>
    );
  }

  if (data.columns.length === 0) {
    return (
      <section className="rounded-xl bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
        No hay combinaciones campo/cultivo para el filtro seleccionado
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h3 className="text-[1.05rem] font-semibold text-slate-950">Vista Integral</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-separate border-spacing-0 text-[0.78rem]">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="sticky left-0 z-[1] w-[220px] bg-slate-50 dark:bg-slate-900 px-4 py-3 text-left text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Métrica
              </th>
              {data.columns.map((column) => (
                <th key={column.id} className="min-w-[180px] px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {column.field_name}
                    </span>
                    <CropBadgeV2 cropName={column.crop_name} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {integralRows.map((row, index) => (
              <tr key={row.key} className="align-middle">
                <th className={integralMetricCellClass(row, index)}>{row.label}</th>
                {data.columns.map((column) => {
                  const value = getFieldCropValue(data, row.key, column.id);
                  return (
                    <td
                      key={`${row.key}-${column.id}`}
                      className={integralValueCellClass(row, index)}
                    >
                      <span
                        className={
                          row.strong
                            ? "font-semibold tabular-nums"
                            : "font-medium tabular-nums text-slate-700 dark:text-slate-200"
                        }
                      >
                        {formatNumberAr(value)}
                      </span>
                      <span
                        className={
                          row.key === "operating_result"
                            ? "ml-1 text-[9px] text-white/60"
                            : "ml-1 text-[9px] text-slate-400"
                        }
                      >
                        {row.unit}
                      </span>
                      {row.indicator && (
                        <span className="ml-2 inline-flex align-middle">
                          <IndicatorDot value={value} size="sm" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SummaryResultsReport;
