interface IndicatorCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  color?: "green" | "red" | "gray" | "default" | "blue" | "amber";
  height?: string;
  width?: string;
  className?: string;
}

const accentColors: Record<string, string> = {
  green: "bg-emerald-600",
  red: "bg-red-500",
  gray: "bg-gray-500",
  default: "bg-custom-btn",
  blue: "bg-blue-600",
  amber: "bg-amber-500",
};

const valueColors: Record<string, string> = {
  green: "text-emerald-700",
  red: "text-red-700",
  gray: "text-gray-800",
  default: "text-gray-800",
  blue: "text-blue-700",
  amber: "text-amber-700",
};

const subtextColors: Record<string, string> = {
  green: "text-emerald-600",
  red: "text-red-600",
  gray: "text-gray-500",
  default: "text-gray-500",
  blue: "text-blue-600",
  amber: "text-amber-600",
};

export function IndicatorCard({
  title,
  value,
  subtext,
  icon,
  color = "default",
  height = "auto",
  width = "auto",
  className = "",
}: IndicatorCardProps) {
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
        <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider leading-tight">
          {title}
        </span>
        <span
          className={`text-sm font-bold leading-snug ${valueColors[color] ?? valueColors.default}`}
        >
          {value}
        </span>
        {subtext && (
          <span
            className={`text-[10px] flex items-center gap-1 mt-0.5 ${subtextColors[color] ?? subtextColors.default}`}
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
  green: "#059669",
  red: "#dc2626",
  gray: "#6b7280",
  default: "#547792",
  blue: "#2563eb",
  amber: "#d97706",
};
