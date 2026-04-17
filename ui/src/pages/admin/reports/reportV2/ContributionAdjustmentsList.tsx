import { Scale, Building2 } from "lucide-react";
import { formatNumberAr } from "../../utils";

export interface AdjustmentItem {
  investor_id: number;
  name: string;
  color: string;
  amount: number;
}

export function ContributionAdjustmentsList({ items }: { items: AdjustmentItem[] }) {
  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-slate-500" />
          <h3
            className="text-base font-semibold text-slate-900"
            style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
          >
            Ajustes de aporte
          </h3>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Diferencia entre lo acordado y el cálculo según participación.
        </p>
      </header>

      <ul className="space-y-2">
        {items.map((it) => {
          const positive = it.amount >= 0;
          const bg = positive ? "bg-emerald-50" : "bg-red-50";
          const fg = positive ? "text-emerald-700" : "text-red-700";
          const sign = positive ? "" : "-";
          return (
            <li
              key={it.investor_id}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${bg}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${it.color}22`, color: it.color }}
                >
                  <Building2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {it.name}
                </span>
              </div>
              <span
                className={`text-sm font-bold tabular-nums ${fg}`}
                style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
              >
                {sign}u$s {formatNumberAr(Math.abs(it.amount))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
