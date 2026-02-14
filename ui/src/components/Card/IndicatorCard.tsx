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
  /** Override subtext color independently of the card color */
  subtextColor?: ColorOption;
  height?: string;
  width?: string;
  className?: string;
}

const valueColors: Record<string, string> = {
  green: "text-gray-900",
  red: "text-gray-900",
  gray: "text-gray-900",
  default: "text-gray-900",
  blue: "text-gray-900",
  amber: "text-gray-900",
  purple: "text-gray-900",
};

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
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex-1 min-w-0 ${className}`}
      style={{ minHeight: height, minWidth: width }}
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: barColors[color] ?? barColors.default }}
      />
      <div className="px-3 py-2 flex flex-col gap-0">
        <span className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider leading-tight">
          {title}
        </span>
        <span
          className={`text-sm font-bold leading-snug ${valueColors[color] ?? valueColors.default}`}
        >
          {value}
        </span>
        {subtext && (
          <span
            className="text-[10px] flex items-center gap-1 mt-0.5"
            style={{
              color:
                barColors[resolvedSubtextColor] ?? barColors.default,
            }}
          >
            {icon}
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

/** Inline hex colors ensure the bar always renders, regardless of Tailwind purge / Material-Tailwind overrides */
const barColors: Record<string, string> = {
  green: "#166534",
  red: "#dc2626",
  gray: "#9ca3af",
  default: "#547792",
  blue: "#1e3a8a",
  amber: "#b45309",
  purple: "#5b21b6",
};
