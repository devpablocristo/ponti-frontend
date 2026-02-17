type ColorOption =
  | "green"
  | "red"
  | "gray"
  | "default"
  | "blue"
  | "amber"
  | "purple";

interface IndicatorCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  color?: ColorOption;
  subtextColor?: ColorOption;
  height?: string;
  width?: string;
  className?: string;
}

export function IndicatorCard({
  title,
  value,
  subtext,
  icon,
  color = "default",
  subtextColor,
  height = "auto",
  width = "auto",
  className = "",
}: IndicatorCardProps) {
  const resolvedSubtextColor = subtextColor ?? color;
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 overflow-hidden flex-1 min-w-0 transition-all duration-200 hover:shadow-md ${className}`}
      style={{ minHeight: height, minWidth: width, boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="h-1 w-full"
        style={{ background: barGradients[color] ?? barGradients.default }}
      />
      <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">
          {title}
        </span>
        <span className="text-base font-bold text-slate-800 leading-snug tracking-tight font-display">
          {value}
        </span>
        {subtext && (
          <span
            className="text-[10px] flex items-center gap-1 mt-0.5 font-medium"
            style={{ color: barColors[resolvedSubtextColor] ?? barColors.default }}
          >
            {icon}
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

const barColors: Record<string, string> = {
  green: "#166534",
  red: "#dc2626",
  gray: "#9ca3af",
  default: "#547792",
  blue: "#1e3a8a",
  amber: "#b45309",
  purple: "#5b21b6",
};

const barGradients: Record<string, string> = {
  green: "linear-gradient(90deg, #166534, #22c55e)",
  red: "linear-gradient(90deg, #dc2626, #f87171)",
  gray: "linear-gradient(90deg, #9ca3af, #d1d5db)",
  default: "linear-gradient(90deg, #3D5A6E, #7BA3BD)",
  blue: "linear-gradient(90deg, #1e3a8a, #60a5fa)",
  amber: "linear-gradient(90deg, #b45309, #fbbf24)",
  purple: "linear-gradient(90deg, #5b21b6, #a78bfa)",
};
