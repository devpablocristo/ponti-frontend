import React from "react";

type Gap = "xs" | "sm" | "md" | "lg";
type Align = "start" | "center" | "end" | "baseline";
type Justify = "start" | "center" | "end" | "between";

interface ClusterProps {
  children: React.ReactNode;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  className?: string;
}

const GAP: Record<Gap, string> = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const ALIGN: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
};

const JUSTIFY: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

/**
 * Horizontal flex con wrap: pensado para action buttons, badges, chips,
 * KPI tiles. Si no entran, hacen wrap automático — never overflow horizontal.
 */
export function Cluster({
  children,
  gap = "sm",
  align = "center",
  justify = "start",
  className = "",
}: ClusterProps) {
  return (
    <div
      className={["flex flex-wrap", GAP[gap], ALIGN[align], JUSTIFY[justify], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
