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
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-[0.86rem] font-semibold tabular-nums truncate ${valueClass}`}>
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
    <div className="relative min-w-0 rounded-xl border bg-white overflow-hidden">
      <div className="h-1 w-full" style={{ background: color }} aria-hidden />

      <div className="px-2.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
              style={{ background: `${color}1A`, color }}
            >
              <Building2 className="h-3 w-3" strokeWidth={2.25} />
            </span>
            <h3 className="text-[0.9rem] font-semibold text-slate-900 truncate">
              {name}
            </h3>
          </div>
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{ background: `${color}1A`, color }}
          >
            {sharePct}%
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-1.5 border-t pt-2">
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
