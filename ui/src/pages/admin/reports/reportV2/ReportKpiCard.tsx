import { type ReactNode } from "react";

type Variant = "hero" | "mint" | "sky" | "stone" | "lavender";

interface Props {
  variant?: Variant;
  label: string;
  value: string;
  meta?: ReactNode;
  icon?: ReactNode;
}

const variantBg: Record<Variant, string> = {
  hero: "bg-slate-900 text-white",
  mint: "bg-[#D8F3E4] text-slate-900",
  sky: "bg-[#DDE9F5] text-slate-900",
  stone: "bg-[#E5E7EB] text-slate-900",
  lavender: "bg-[#E4E0F5] text-slate-900",
};

const variantIconColor: Record<Variant, string> = {
  hero: "text-white/40",
  mint: "text-emerald-700",
  sky: "text-sky-700",
  stone: "text-slate-600",
  lavender: "text-violet-700",
};

const variantMetaColor: Record<Variant, string> = {
  hero: "text-white/70",
  mint: "text-emerald-800/80",
  sky: "text-sky-800/80",
  stone: "text-slate-600",
  lavender: "text-violet-800/80",
};

export function ReportKpiCard({ variant = "stone", label, value, meta, icon }: Props) {
  const isHero = variant === "hero";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-5 py-4 flex-1 min-w-[180px] ${variantBg[variant]}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isHero ? "text-white/70" : "text-slate-500"
            }`}
          >
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight truncate tabular-nums" style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}>
            {value}
          </div>
          {meta && (
            <div className={`mt-1 text-xs font-medium ${variantMetaColor[variant]}`}>
              {meta}
            </div>
          )}
        </div>
        {icon && (
          <div className={`shrink-0 ${variantIconColor[variant]}`} aria-hidden>
            {icon}
          </div>
        )}
      </div>

      {isHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full opacity-[0.06] bg-white"
        />
      )}
    </div>
  );
}
