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
  color: string;
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
    <div className="rounded-xl border bg-white p-4">
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <div>
            <h3 className="text-xl font-medium text-[#020617]">Distribución por inversor</h3>
            <p className="text-[11px] text-slate-500">% y monto aportado por ítem</p>
          </div>
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
          <div key={cat.key} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-slate-600">
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{cat.label}</div>
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">u$s {formatNumberAr(cat.total)}</div>
                </div>
              </div>
            </div>

            <div className="flex h-7 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
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

            <div className="mt-2 flex gap-3 flex-wrap">
              {cat.slices.map((s) => (
                <span
                  key={s.investor_id}
                  className="text-[11px] text-slate-500 tabular-nums"
                >
                  {s.name}: u$s {formatNumberAr(s.amount)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
