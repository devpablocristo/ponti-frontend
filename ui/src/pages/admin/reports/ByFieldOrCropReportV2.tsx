import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  SquareArrowOutUpRight,
  ChevronDown,
  ChevronRight,
  Wheat,
  Layers,
  Tractor,
  TrendingUp,
  Percent,
  Home,
} from "lucide-react";
import { FilterBar } from "@/components/filters/AppFilterBar";
import { usePDF } from "react-to-pdf";

import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import SelectField from "../../../components/Input/SelectField";
import useReporting from "../../../hooks/useReporting";
import type { FieldCropReportData } from "../../../hooks/useReporting/types.ts";
import { formatNumberAr } from "../utils";

import { ReportKpiCard } from "./reportV2/ReportKpiCard";
import { IndicatorDot } from "./reportV2/IndicatorDot";
import { CropBadgeV2 } from "./reportV2/CropBadgeV2";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

interface MetricDef {
  key: string;
  label: string;
  unit?: string;
  strong?: boolean;
  indicator?: boolean;
}

interface SectionDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  metrics: MetricDef[];
}

const SECTIONS: SectionDef[] = [
  {
    key: "overview",
    label: "Campaña",
    icon: <Wheat className="h-3.5 w-3.5" />,
    metrics: [
      { key: "surface", label: "Superficie", unit: "Ha" },
      { key: "production", label: "Producción", unit: "Tn" },
      { key: "yield", label: "Rendimiento", unit: "Tn/Ha", strong: true },
    ],
  },
  {
    key: "pricing",
    label: "Precios e ingresos",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    metrics: [
      { key: "gross_price", label: "Precio bruto", unit: "u$s/Tn", strong: true },
      { key: "freight_cost", label: "Flete", unit: "u$s/Tn" },
      { key: "commercial_cost", label: "Gasto comercial", unit: "u$s/Tn" },
      { key: "net_price", label: "Precio neto", unit: "u$s/Tn", strong: true },
      { key: "net_income", label: "Ingreso neto", unit: "u$s/Tn", strong: true },
    ],
  },
  {
    key: "labors",
    label: "Labores",
    icon: <Tractor className="h-3.5 w-3.5" />,
    metrics: [
      { key: "labor_siembra", label: "Siembra" },
      { key: "labor_pulverizacion", label: "Pulverización" },
      { key: "labor_riego", label: "Riego" },
      { key: "labor_cosecha", label: "Cosecha" },
      { key: "labor_otras", label: "Otras labores" },
      { key: "labors_cost", label: "Total labores", unit: "u$s/Ha", strong: true },
    ],
  },
  {
    key: "supplies",
    label: "Insumos",
    icon: <Layers className="h-3.5 w-3.5" />,
    metrics: [
      { key: "supply_semillas", label: "Semillas" },
      { key: "supply_curasemillas", label: "Curasemillas" },
      { key: "supply_herbicidas", label: "Herbicidas" },
      { key: "supply_insecticidas", label: "Insecticidas" },
      { key: "supply_coadyuvantes", label: "Coadyuvantes" },
      { key: "supply_fertilizantes", label: "Fertilizantes" },
      { key: "supply_fungicidas", label: "Fungicidas" },
      { key: "supply_otros", label: "Otros insumos" },
      { key: "supplies_cost", label: "Total insumos", unit: "u$s/Ha", strong: true },
    ],
  },
  {
    key: "result",
    label: "Resultado",
    icon: <Percent className="h-3.5 w-3.5" />,
    metrics: [
      { key: "total_direct_costs", label: "Costos directos", unit: "u$s/Ha", strong: true },
      { key: "gross_margin", label: "Margen bruto", unit: "u$s/Ha", strong: true },
      { key: "lease", label: "Arriendo", unit: "u$s/Ha" },
      { key: "admin", label: "Admin. y estructura", unit: "u$s/Ha" },
      { key: "operating_result", label: "Resultado operativo", unit: "u$s/Ha", strong: true, indicator: true },
      { key: "total_invested", label: "Total activo", unit: "u$s/Ha", strong: true },
      { key: "return_pct", label: "Renta del cultivo", unit: "%", strong: true, indicator: true },
      { key: "indifference_yield", label: "Rinde de indiferencia", unit: "Tn/Ha" },
      { key: "indifference_price", label: "Precio de indiferencia", unit: "u$s/Tn" },
    ],
  },
];

function getValue(data: FieldCropReportData, rowKey: string, columnId: string): number {
  const row = data.rows.find((r) => r.key === rowKey);
  if (!row || !row.values[columnId]) return 0;
  return parseFloat(row.values[columnId].number) || 0;
}

export function ByFieldOrCropReportV2() {
  const [selectedField, setSelectedField] = useState<string>("0");
  const [selectedCrop, setSelectedCrop] = useState<string>("0");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    pricing: false,
    labors: false,
    supplies: false,
    result: true,
  });

  const toggleSection = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const {
    fieldCropReportingData: data,
    processing,
    error,
    getFieldCropReportingData,
  } = useReporting();

  const { filters, projectId, selectedCampaignId, loading } = useWorkspaceFilters([
    "project",
    "campaign",
  ]);

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    return new URLSearchParams(params).toString();
  }, [projectId, selectedCampaignId]);

  useEffect(() => {
    getFieldCropReportingData(buildQueryParams());
  }, [buildQueryParams, getFieldCropReportingData]);

  const filtered = useMemo(() => {
    if (!data) return null;
    let columns = data.columns;
    if (selectedField !== "0") {
      columns = columns.filter((c) => c.field_id.toString() === selectedField);
    }
    if (selectedCrop !== "0") {
      columns = columns.filter((c) => c.crop_id.toString() === selectedCrop);
    }
    return { ...data, columns };
  }, [data, selectedField, selectedCrop]);

  const fieldOptions = useMemo(() => {
    if (!data?.columns) return [];

    return data.columns.reduce(
      (acc, column) => {
        if (!acc.some((field) => field.id === column.field_id)) {
          acc.push({ id: column.field_id, name: column.field_name });
        }
        return acc;
      },
      [{ id: 0, name: "Todos" }],
    );
  }, [data]);

  const cropOptions = useMemo(() => {
    if (!data?.columns) return [];

    return data.columns.reduce(
      (acc, column) => {
        if (!acc.some((crop) => crop.id === column.crop_id)) {
          acc.push({ id: column.crop_id, name: column.crop_name });
        }
        return acc;
      },
      [{ id: 0, name: "Todos" }],
    );
  }, [data]);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const { toPDF, targetRef } = usePDF({
    filename: `informe-campo-cultivo-${timestamp}.pdf`,
  });

  const kpiSummary = useMemo(() => {
    if (!filtered || filtered.columns.length === 0) return null;
    const surfaceTotal = filtered.columns.reduce(
      (s, col) => s + getValue(filtered, "surface", col.id),
      0,
    );
    const productionTotal = filtered.columns.reduce(
      (s, col) => s + getValue(filtered, "production", col.id),
      0,
    );
    const operatingAvg =
      filtered.columns.reduce(
        (s, col) => s + getValue(filtered, "operating_result", col.id),
        0,
      ) / filtered.columns.length;
    const returnAvg =
      filtered.columns.reduce(
        (s, col) => s + getValue(filtered, "return_pct", col.id),
        0,
      ) / filtered.columns.length;
    const investedAvg =
      filtered.columns.reduce(
        (s, col) => s + getValue(filtered, "total_invested", col.id),
        0,
      ) / filtered.columns.length;

    return { surfaceTotal, productionTotal, operatingAvg, returnAvg, investedAvg };
  }, [filtered]);

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
            onClick: () => getFieldCropReportingData(buildQueryParams()),
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
                Informe por Campo / Cultivo
              </h2>
              <p className="text-xs text-slate-500">
                Performance por combinación campo–cultivo
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-44">
                <SelectField
                  label="Campo"
                  name="field"
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  options={fieldOptions}
                  size="sm"
                  fullWidth
                />
              </div>
              <div className="w-44">
                <SelectField
                  label="Cultivo"
                  name="crop"
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  options={cropOptions}
                  size="sm"
                  fullWidth
                />
              </div>
            </div>
          </header>

          {kpiSummary && (
            <div className="flex flex-wrap gap-3">
              <ReportKpiCard
                variant="hero"
                label="Superficie total"
                value={`${formatNumberAr(kpiSummary.surfaceTotal)} Ha`}
                meta={`${filtered.columns.length} combinación(es)`}
                icon={<Home className="h-5 w-5" />}
              />
              <ReportKpiCard
                variant="mint"
                label="Producción total"
                value={`${formatNumberAr(kpiSummary.productionTotal)} Tn`}
                icon={<Wheat className="h-5 w-5" />}
              />
              <ReportKpiCard
                variant="sky"
                label="Activo promedio"
                value={`u$s ${formatNumberAr(kpiSummary.investedAvg)}`}
                meta="por hectárea"
                icon={<Layers className="h-5 w-5" />}
              />
              <ReportKpiCard
                variant={kpiSummary.operatingAvg >= 0 ? "mint" : "stone"}
                label="Result. operativo prom."
                value={`${kpiSummary.operatingAvg < 0 ? "-" : ""}u$s ${formatNumberAr(Math.abs(kpiSummary.operatingAvg))}`}
                meta="u$s/Ha"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <ReportKpiCard
                variant="lavender"
                label="Rentabilidad prom."
                value={`${kpiSummary.returnAvg.toFixed(1)}%`}
                icon={<Percent className="h-5 w-5" />}
              />
            </div>
          )}

          {filtered.columns.length === 0 ? (
            <div className="p-4 text-sm text-slate-600 rounded-lg bg-slate-50">
              No hay combinaciones campo/cultivo para los filtros seleccionados
            </div>
          ) : (
            <div className="space-y-3">
              {SECTIONS.map((section) => (
                <SectionCard
                  key={section.key}
                  section={section}
                  data={filtered}
                  open={openSections[section.key]}
                  onToggle={() => toggleSection(section.key)}
                />
              ))}
            </div>
          )}
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

function SectionCard({
  section,
  data,
  open,
  onToggle,
}: {
  section: SectionDef;
  data: FieldCropReportData;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
          {section.icon}
        </span>
        <h3
          className="flex-1 text-left text-sm font-bold text-slate-900 uppercase tracking-wide"
          style={{ fontFamily: SORA }}
        >
          {section.label}
        </h3>
        <span className="text-[11px] font-medium text-slate-500">
          {section.metrics.length} métricas
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-slate-200/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="sticky left-0 bg-slate-50/60 px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[240px]">
                  Métrica
                </th>
                {data.columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-2.5 text-center align-middle min-w-[180px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        {col.field_name}
                      </span>
                      <CropBadgeV2 cropName={col.crop_name} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.metrics.map((metric, i) => (
                <tr
                  key={metric.key}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                >
                  <th
                    className={`sticky left-0 px-5 py-2.5 text-left text-xs ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    } ${metric.strong ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}
                  >
                    {metric.label}
                  </th>
                  {data.columns.map((col) => {
                    const value = getValue(data, metric.key, col.id);
                    return (
                      <td key={col.id} className="px-4 py-2.5 text-center align-middle">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`tabular-nums ${metric.strong ? "text-sm font-bold text-slate-900" : "text-sm font-medium text-slate-700"}`}
                            style={metric.strong ? { fontFamily: SORA } : undefined}
                          >
                            {formatNumberAr(value)}
                          </span>
                          {metric.unit && (
                            <span className="text-[10px] text-slate-400">
                              {metric.unit}
                            </span>
                          )}
                          {metric.indicator && (
                            <IndicatorDot value={value} size="sm" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ByFieldOrCropReportV2;
