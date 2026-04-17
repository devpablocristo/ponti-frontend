import { type ReactNode } from "react";
import { Users } from "lucide-react";
import { formatNumberAr } from "../../utils";

export interface InvestorSlice {
  investor_id: number;
  name: string;
  amount: number;
  color: string;
}

export interface DistributionCategory {
  key: string;
  label: string;
  icon: ReactNode;
  total: number;
  slices: InvestorSlice[];
}

export interface LegendItem {
  investor_id: number;
  name: string;
  color: string;
  sharePct: number;
}

interface Props {
  categories: DistributionCategory[];
  legend: LegendItem[];
}

export function InvestorDistributionBars({ categories, legend }: Props) {
  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <h3
            className="text-base font-semibold text-slate-900"
            style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
          >
            Distribución por inversor
          </h3>
        </div>
        <ul className="flex items-center gap-4 flex-wrap">
          {legend.map((l) => (
            <li key={l.investor_id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: l.color }}
              />
              <span className="text-[11px] font-semibold text-slate-700">
                {l.name}
              </span>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: l.color }}
              >
                {l.sharePct}%
              </span>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {cat.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {cat.label}
                </span>
              </div>
              <span
                className="text-sm font-bold text-slate-900 tabular-nums"
                style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
              >
                u$s {formatNumberAr(cat.total)}
              </span>
            </div>

            <div className="flex h-6 w-full overflow-hidden rounded-full bg-slate-100">
              {cat.slices.map((s) => {
                const pct = cat.total > 0 ? (s.amount / cat.total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={s.investor_id}
                    className="flex items-center justify-center text-[10px] font-bold text-white/95"
                    style={{ width: `${pct}%`, background: s.color }}
                    title={`${s.name}: u$s ${formatNumberAr(s.amount)}`}
                  >
                    {pct >= 8 && `${pct.toFixed(0)}%`}
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5 flex gap-3 flex-wrap">
              {cat.slices.map((s) => (
                <span
                  key={s.investor_id}
                  className="text-[11px] text-slate-500 tabular-nums"
                >
                  u$s {formatNumberAr(s.amount)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
