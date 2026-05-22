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
  const size = 168;
  const strokeW = 24;
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
    <div className="flex h-full flex-col rounded-xl border bg-white dark:bg-slate-800 p-3">
      <header className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <div>
          <h3 className="text-[1.05rem] font-semibold text-[#020617]">Composición de los Aportes</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">% sobre el total invertido</p>
        </div>
      </header>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-5">
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
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">u$s</span>
            <span className="text-[1.6rem] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatNumberAr(total)}</span>
          </div>
        </div>

        <ul className="min-w-[190px] flex-1 space-y-2">
          {segments.map((s, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-[0.7rem] font-medium text-slate-600 dark:text-slate-300">
                  {s.label}
                </div>
                <div className="text-[0.78rem] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  u$s {formatNumberAr(s.value)}
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {(s.frac * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
