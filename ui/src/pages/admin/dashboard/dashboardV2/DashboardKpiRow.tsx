import { Sprout, Wallet, Wheat, Users, TrendingUp } from "lucide-react";
import { ReportKpiCard } from "../../reports/reportV2/ReportKpiCard";
import { ProgressBar } from "./ProgressBar";
import { formatNumberAr } from "../../utils";
import type { DashboardData } from "../../../../hooks/useDashboard/types";
import { investorColor } from "../../reports/reportV2/lib/investorPalette";

function n(v: string | number | undefined | null): number {
  return Number(v) || 0;
}

export function DashboardKpiRow({ dashboard }: { dashboard: DashboardData }) {
  const { metrics } = dashboard;
  const sowingPct = n(metrics.sowing.progress_pct);
  const harvestPct = n(metrics.harvest.progress_pct);
  const costsPct = n(metrics.costs.progress_pct);
  const rentPct = n(metrics.operating_result.margin_pct);
  const rentPositive = rentPct >= 0;

  return (
    <div className="flex flex-wrap gap-3">
      <ReportKpiCard
        variant={rentPositive ? "hero" : "stone"}
        label="Renta"
        value={`${rentPct.toFixed(1)}%`}
        meta={
          <span>
            u$s {formatNumberAr(metrics.operating_result.result_usd)} / u$s{" "}
            {formatNumberAr(metrics.operating_result.total_costs_usd)}
          </span>
        }
        icon={<Wallet className="h-5 w-5" />}
      />

      <ProgressKpi
        variant="mint"
        label="Avance siembra"
        pct={sowingPct}
        color="#0E9F6E"
        caption={`${formatNumberAr(metrics.sowing.hectares)} / ${formatNumberAr(metrics.sowing.total_hectares)} Ha`}
        icon={<Sprout className="h-5 w-5" />}
      />

      <ProgressKpi
        variant="sky"
        label="Avance cosecha"
        pct={harvestPct}
        color="#3B82F6"
        caption={`${formatNumberAr(metrics.harvest.hectares)} / ${formatNumberAr(metrics.harvest.total_hectares)} Ha`}
        icon={<Wheat className="h-5 w-5" />}
      />

      <ProgressKpi
        variant="stone"
        label="Avance costos"
        pct={costsPct}
        color="#EF4444"
        caption={`u$s ${formatNumberAr(metrics.costs.executed_usd)} / u$s ${formatNumberAr(metrics.costs.budget_usd)}`}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      <InvestorContributionsKpi dashboard={dashboard} />
    </div>
  );
}

function ProgressKpi({
  variant,
  label,
  pct,
  color,
  caption,
  icon,
}: {
  variant: "mint" | "sky" | "stone" | "lavender";
  label: string;
  pct: number;
  color: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <ReportKpiCard
      variant={variant}
      label={label}
      value={`${pct.toFixed(0)}%`}
      icon={icon}
      meta={
        <div className="flex flex-col gap-1.5 w-full">
          <ProgressBar value={pct} color={color} height="sm" />
          <span className="tabular-nums">{caption}</span>
        </div>
      }
    />
  );
}

function InvestorContributionsKpi({ dashboard }: { dashboard: DashboardData }) {
  const items = dashboard.metrics.investor_contributions.items ?? [];
  const count = items.length;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-[#E4E0F5] text-slate-900 px-5 py-4 flex-1 min-w-[180px]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Aportes por inversor
          </div>
          <div
            className="mt-2 text-2xl font-bold tracking-tight tabular-nums"
            style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
          >
            {count}
          </div>
        </div>
        <Users className="h-5 w-5 shrink-0 text-violet-700" aria-hidden />
      </div>

      {count > 0 ? (
        <ul className="space-y-1.5">
          {items.slice(0, 3).map((inv, i) => {
            const color = investorColor(i);
            const progress = n(inv.contributions_progress_pct);
            return (
              <li key={inv.investor_id} className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">
                  {inv.investor_name}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {progress.toFixed(0)}%
                </span>
              </li>
            );
          })}
          {count > 3 && (
            <li className="text-[10px] text-slate-500">+ {count - 3} más</li>
          )}
        </ul>
      ) : (
        <span className="text-xs text-slate-500">Sin inversores</span>
      )}
    </div>
  );
}
