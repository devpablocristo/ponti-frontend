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
    <div className="flex h-full w-full flex-col rounded-xl border bg-white p-2">
      <header className="mb-2">
        <div className="flex items-center gap-2">
          <Scale className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[1.15rem] font-medium text-[#020617]">Ajustes de aporte</h3>
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
          Diferencia entre lo acordado y el cálculo según participación.
        </p>
      </header>

      <ul className="flex flex-1 flex-col gap-1.5">
        {items.map((it) => {
          const positive = it.amount >= 0;
          const bg = positive ? "bg-[#F3FAF7]" : "bg-[#FDF2F2]";
          const fg = positive ? "text-[#0E9F6E]" : "text-[#F05252]";
          const sign = positive ? "" : "-";
          return (
            <li
              key={it.investor_id}
              className={`flex flex-1 items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${bg}`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border"
                  style={{ background: `${it.color}22`, color: it.color }}
                >
                  <Building2 className="h-2.5 w-2.5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 break-words text-[0.84rem] font-semibold leading-tight text-slate-800">
                  {it.name}
                </span>
              </div>
              <span className={`shrink-0 text-right text-[0.84rem] font-semibold tabular-nums ${fg}`}>
                {sign}u$s {formatNumberAr(Math.abs(it.amount))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
