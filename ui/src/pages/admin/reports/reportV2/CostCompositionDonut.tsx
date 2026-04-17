import { PieChart } from "lucide-react";
import { formatNumberAr } from "../../utils";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  total: number;
}

export function CostCompositionDonut({ slices, total }: Props) {
  const size = 180;
  const strokeW = 26;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = frac * circumference;
    const seg = {
      ...s,
      frac,
      dash: `${len} ${circumference - len}`,
      offset: -offset,
    };
    offset += len;
    return seg;
  });

  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="flex items-center gap-2 mb-4">
        <PieChart className="h-4 w-4 text-slate-500" />
        <h3
          className="text-base font-semibold text-slate-900"
          style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
        >
          Composición del costo
        </h3>
      </header>

      <div className="flex items-center gap-5 flex-wrap">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeW}
            />
            {segments.map((s, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeW}
                strokeDasharray={s.dash}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-slate-500">u$s</span>
            <span
              className="text-xl font-bold text-slate-900 tabular-nums"
              style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
            >
              {formatNumberAr(total)}
            </span>
          </div>
        </div>

        <ul className="flex-1 space-y-2.5 min-w-[180px]">
          {segments.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-600 truncate">
                  {s.label}
                </div>
                <div
                  className="text-sm font-bold text-slate-900 tabular-nums"
                  style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
                >
                  u$s {formatNumberAr(s.value)}
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                {(s.frac * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
