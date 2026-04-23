import { type ReactNode } from "react";
import { formatNumberAr } from "../../utils";

interface Props {
  totalInvested: number;
  perHa: number;
  icon?: ReactNode;
}

export function ReportKpiRow({ totalInvested, perHa, icon }: Props) {
  return (
    <section className="relative h-full overflow-hidden rounded-xl bg-[#0F1D4F] px-3 py-3 text-white xl:w-[170px] xl:shrink-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full border border-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-8 h-2.5 w-2.5 rounded-full bg-white/10"
      />

      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/90">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-white/60">
            Total invertido
          </div>
          <div className="mt-1 text-[0.9rem] leading-snug text-white/75">
            Inversión acumulada y costo por hectárea
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/60">
          Monto total
        </div>
          <div className="mt-2 text-[1.55rem] font-semibold leading-none tabular-nums">
            u$s {formatNumberAr(totalInvested)}
          </div>
        <div className="mt-2.5 text-[0.95rem] font-semibold tabular-nums text-white/85">
          {formatNumberAr(perHa)} u$s/ha
        </div>
      </div>
    </section>
  );
}
