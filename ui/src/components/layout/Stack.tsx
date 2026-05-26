import React from "react";

type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
type Direction = "row" | "col";
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around";

interface StackProps {
  children: React.ReactNode;
  direction?: Direction;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  className?: string;
  as?: React.ElementType;
}

const GAP: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const ALIGN: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

/**
 * Flex container. Vertical por default. Reemplaza divs ad-hoc con
 * `flex flex-col gap-N items-X justify-Y` para forzar consistencia.
 */
export function Stack({
  children,
  direction = "col",
  gap = "md",
  align,
  justify,
  className = "",
  as: Tag = "div",
}: StackProps) {
  const dir = direction === "row" ? "flex-row" : "flex-col";
  return (
    <Tag
      className={[
        "flex",
        dir,
        GAP[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
