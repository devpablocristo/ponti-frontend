import { Building2 } from "lucide-react";
import { formatNumberAr } from "../../utils";

interface Props {
  name: string;
  color: string;
  contributed: number;
  sharePct: number;
  adjustment: number;
}

function Metric({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 whitespace-nowrap text-[0.78rem] font-semibold leading-tight tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

export function InvestorShareCard({ name, color, contributed, sharePct, adjustment }: Props) {
  const adjPositive = adjustment >= 0;
  const adjColor = adjPositive ? "text-emerald-600" : "text-red-600";
  const adjSign = adjPositive ? "" : "-";
  const adjAbs = Math.abs(adjustment);

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-xl border bg-white"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: color }} aria-hidden />

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
              style={{ background: `${color}1A`, color }}
            >
              <Building2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <h3 className="truncate text-[0.82rem] font-semibold text-slate-900">
              {name}
            </h3>
          </div>
          <span
            className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{ background: `${color}1A`, color }}
          >
            {sharePct}%
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
          <Metric label="Aportado" value={`u$s ${formatNumberAr(contributed)}`} />
          <Metric label="Participación" value={`${sharePct}%`} />
          <Metric
            label="Ajuste"
            value={`${adjSign}u$s ${formatNumberAr(adjAbs)}`}
            valueClass={adjColor}
          />
        </div>
      </div>
    </div>
  );
}
