interface Props {
  value: number;
  color?: string;
  height?: "sm" | "md";
}

export function ProgressBar({ value, color = "#10B981", height = "md" }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const h = height === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${h}`}>
      <div
        className={`${h} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
