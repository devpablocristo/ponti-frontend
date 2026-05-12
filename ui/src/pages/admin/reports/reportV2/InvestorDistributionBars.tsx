import { type ReactNode } from "react";
import { Users } from "lucide-react";
import { formatNumberAr } from "../../utils";

interface InvestorSlice {
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
    <div className="rounded-xl border bg-white p-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <div>
            <h3 className="text-[1.05rem] font-semibold text-[#020617]">Distribución por inversor</h3>
            <p className="text-[11px] text-slate-500">% y monto aportado por ítem</p>
          </div>
        </div>
        <ul className="flex flex-wrap items-center gap-3">
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

      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="grid gap-2 rounded-lg border px-2.5 py-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-slate-600">
                {cat.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[0.8rem] font-semibold leading-tight text-slate-800">
                  {cat.label}
                </div>
                <div className="text-[0.78rem] font-semibold tabular-nums text-slate-900">
                  u$s {formatNumberAr(cat.total)}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex h-5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                {cat.slices.map((s) => {
                  const pct = cat.total > 0 ? (s.amount / cat.total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={s.investor_id}
                      className="flex min-w-0 items-center justify-center overflow-hidden text-[11px] font-bold text-white/95"
                      style={{ width: `${pct}%`, background: s.color }}
                      title={`${s.name}: u$s ${formatNumberAr(s.amount)}`}
                    >
                      {pct >= 7 && `${pct.toFixed(0)}%`}
                    </div>
                  );
                })}
              </div>

              <div className="mt-1.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, cat.slices.length)}, minmax(0, 1fr))` }}>
                {cat.slices.map((s) => (
                  <span
                    key={s.investor_id}
                    className="truncate text-center text-[10px] text-slate-500 tabular-nums"
                    title={`${s.name}: u$s ${formatNumberAr(s.amount)}`}
                  >
                    u$s {formatNumberAr(s.amount)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
