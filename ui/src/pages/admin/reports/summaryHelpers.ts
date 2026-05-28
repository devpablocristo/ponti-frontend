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
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /^todos\b/i.test(trimmed)) return "0";
    return trimmed;
  }

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
  const base = "px-4 py-3 text-[0.82rem] text-left font-medium";
  const zebra =
    index % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-900/40" : "bg-white dark:bg-slate-800";
  const highlighted =
    row.key === "total_invested" || row.key === "operating_result" || row.key === "return_pct";
  const highlight =
    row.key === "total_invested"
      ? "bg-rose-100 text-slate-950 dark:bg-rose-950/40 dark:text-rose-100"
      : row.key === "operating_result"
        ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
        : row.key === "return_pct"
          ? "bg-rose-50 text-slate-950 dark:bg-rose-950/30 dark:text-rose-100"
          : zebra;
  const strong = row.strong ? "font-semibold" : "";
  const text = highlighted
    ? ""
    : row.strong
      ? "text-slate-900 dark:text-slate-100"
      : "text-slate-600 dark:text-slate-300";
  return `${base} ${highlight} ${strong} ${text}`;
}

export function integralValueCellClass(row: IntegralRow, index: number) {
  const base = "px-4 py-3 text-center text-[0.82rem] tabular-nums";
  const zebra =
    index % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-900/40" : "bg-white dark:bg-slate-800";
  const highlighted =
    row.key === "total_invested" || row.key === "operating_result" || row.key === "return_pct";
  const highlight =
    row.key === "total_invested"
      ? "bg-rose-100 text-slate-950 dark:bg-rose-950/40 dark:text-rose-100"
      : row.key === "operating_result"
        ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
        : row.key === "return_pct"
          ? "bg-rose-50 text-slate-950 dark:bg-rose-950/30 dark:text-rose-100"
          : zebra;
  const strong = row.strong ? "font-semibold" : "";
  const text = highlighted
    ? ""
    : row.strong
      ? "text-slate-900 dark:text-slate-100"
      : "text-slate-700 dark:text-slate-200";
  return `${base} ${highlight} ${strong} ${text}`;
}
