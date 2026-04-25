import { type ReactNode } from "react";
import { formatNumberAr } from "../../utils";

interface Props {
  totalInvested: number;
  perHa: number;
  icon?: ReactNode;
}

export function ReportKpiRow({ totalInvested, perHa, icon }: Props) {
  return (
    <section className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-[#F8B4B4] to-[#FBD5D5] px-3 py-3 text-[#111827]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full border border-[#F05252]/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-8 h-2.5 w-2.5 rounded-full bg-[#F05252]/15"
      />

      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/45 text-[#F05252]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[#7F1D1D]/65">
            Total invertido
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[#7F1D1D]/65">
          Monto total
        </div>
        <div className="mt-2 text-[1.55rem] font-semibold leading-none tabular-nums">
          u$s {formatNumberAr(totalInvested)}
        </div>
        <div className="mt-2.5 text-[0.95rem] font-semibold tabular-nums text-[#7F1D1D]/80">
          {formatNumberAr(perHa)} u$s/ha
        </div>
      </div>
    </section>
  );
}
