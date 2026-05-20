interface Props {
  value: number | string;
  size?: "sm" | "md";
}

function tone(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "#94A3B8";
  if (n <= 0) return "#F87171";
  if (n < 6) return "#FACA15";
  return "#31C48D";
}

export function IndicatorDot({ value, size = "md" }: Props) {
  const color = tone(value);
  const box = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const dot = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span className={`relative inline-flex shrink-0 ${box}`} aria-hidden>
      <span
        className="absolute inset-0 rounded-full opacity-30"
        style={{ background: color }}
      />
      <span
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dot}`}
        style={{ background: color }}
      />
    </span>
  );
}
