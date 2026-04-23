import { InvestorShareCard } from "./InvestorShareCard";
import { formatNumberAr } from "../../utils";

export interface InvestorShareItem {
  investor_id: number;
  name: string;
  color: string;
  contributed: number;
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
    <section className="min-w-0 h-full rounded-xl border bg-white p-2.5 xl:flex-1">
      <header className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.65rem] font-medium text-[#020617]">Aportes por inversor</h2>
          <p className="mt-0.5 text-[0.92rem] text-slate-500">Participación, aportes y ajustes</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.84rem] text-slate-600 whitespace-nowrap">Superficie</span>
            <span className="inline-flex rounded-lg border bg-[#F8FAFC] px-1.5 py-0.5 text-[0.82rem] font-semibold text-slate-900 tabular-nums">
              {formatNumberAr(surfaceTotalHa)} Ha
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.84rem] text-slate-600 whitespace-nowrap">Admin. proyecto / Ha</span>
            <span className="inline-flex rounded-lg border bg-[#F8FAFC] px-1.5 py-0.5 text-[0.82rem] font-semibold text-slate-900 tabular-nums">
              u$s {formatNumberAr(adminPerHaUsd)}
            </span>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        {investors.map((inv) => (
          <InvestorShareCard
            key={inv.investor_id}
            name={inv.name}
            color={inv.color}
            contributed={inv.contributed}
            sharePct={inv.sharePct}
            adjustment={inv.adjustment}
          />
        ))}
      </div>
    </section>
  );
}
