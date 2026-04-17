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
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div
        className={`mt-0.5 text-lg font-bold tabular-nums truncate ${valueClass}`}
        style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
      >
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
      className="relative flex-1 min-w-[280px] rounded-2xl bg-white border border-slate-200/80 overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color }}
        aria-hidden
      />

      <div className="pl-6 pr-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${color}1A`, color }}
            >
              <Building2 className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <h3
              className="text-base font-semibold text-slate-900 truncate"
              style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
            >
              {name}
            </h3>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
            style={{ background: `${color}1A`, color }}
          >
            {sharePct}%
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
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
