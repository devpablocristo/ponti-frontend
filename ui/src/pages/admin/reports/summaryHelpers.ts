import type { CSSProperties } from "react";

import type {
  FieldCropReportData,
  SummaryResultsReportData,
} from "../../../hooks/useReporting/types";
import { formatNumberAr } from "../utils";

/**
 * Constantes, types y funciones puras del SummaryResultsReport.
 * Sin React/JSX (los tabs y sub-componentes se quedan en el archivo
 * principal porque comparten muchos types/refs).
 */

export type ReportTab = "executive" | "economic" | "integral";
export type SummaryTotals = SummaryResultsReportData["totals"];
export type SummaryCrop = SummaryResultsReportData["crops"][number];

export const REPORT_FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
export const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

export const KPI_TYPOGRAPHY_DEFAULTS = {
  "--summary-kpi-label-size": "7.5px",
  "--summary-kpi-value-size": "16.64px",
  "--summary-kpi-meta-size": "10.24px",
} as CSSProperties;

export const integralRows = [
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

export type IntegralRow = (typeof integralRows)[number];

export function n(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value: string | number | null | undefined): string {
  return `u$s ${formatNumberAr(n(value))}`;
}

export function percent(value: string | number | null | undefined): string {
  return `${formatNumberAr(n(value))}%`;
}

export function getFieldCropValue(
  data: FieldCropReportData,
  rowKey: string,
  columnId: string,
): number {
  const row = data.rows.find((entry) => entry.key === rowKey);
  return n(row?.values[columnId]?.number);
}

export function cropIdFromUnknown(value: unknown): string {
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

export function integralMetricCellClass(row: IntegralRow, index: number) {
  const base = "px-2 py-2 text-[8px] font-medium";
  const alignment = index === 0 ? "text-left pl-3" : "text-right";
  const strong = row.strong ? "text-slate-900 font-semibold" : "text-slate-600";
  return `${base} ${alignment} ${strong}`;
}

export function integralValueCellClass(row: IntegralRow, index: number) {
  const base = "px-2 py-2 text-[8px] tabular-nums";
  const alignment = index === 0 ? "text-left pl-3" : "text-right";
  const strong = row.strong ? "font-semibold text-slate-900" : "text-slate-700";
  return `${base} ${alignment} ${strong}`;
}
