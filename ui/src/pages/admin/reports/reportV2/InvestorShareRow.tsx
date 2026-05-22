import { InvestorShareCard } from "./InvestorShareCard";
import { formatNumberAr } from "../../utils";

export interface InvestorShareItem {
  investor_id: number;
  name: string;
  color: string;
  contributed: number;
  actualPct: number;
  sharePct: number;
  adjustment: number;
}

interface Props {
  investors: InvestorShareItem[];
  surfaceTotalHa: number;
  adminPerHaUsd: number;
}

export function InvestorShareRow({ investors, surfaceTotalHa, adminPerHaUsd }: Props) {
  return (
    <section className="min-w-0 rounded-xl border bg-white dark:bg-slate-800 p-2.5">
      <header className="mb-2.5 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-[#020617]">Aportes por inversor</h2>
          <p className="mt-0.5 text-[0.72rem] text-slate-500 dark:text-slate-400">Aporte actual, acordado y ajustes</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-white dark:bg-slate-800 px-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.72rem] text-slate-600 dark:text-slate-300 whitespace-nowrap">Superficie</span>
            <span className="inline-flex rounded-lg border bg-[#F8FAFC] px-1.5 py-0.5 text-[0.72rem] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumberAr(surfaceTotalHa)} Ha
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.72rem] text-slate-600 dark:text-slate-300 whitespace-nowrap">Admin. proyecto / Ha</span>
            <span className="inline-flex rounded-lg border bg-[#F8FAFC] px-1.5 py-0.5 text-[0.72rem] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              u$s {formatNumberAr(adminPerHaUsd)}
            </span>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2">
        {investors.map((inv) => (
          <InvestorShareCard
            key={inv.investor_id}
            name={inv.name}
            color={inv.color}
            contributed={inv.contributed}
            actualPct={inv.actualPct}
            sharePct={inv.sharePct}
            adjustment={inv.adjustment}
          />
        ))}
      </div>
    </section>
  );
}
