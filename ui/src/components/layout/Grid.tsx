import React from "react";

type Gap = "sm" | "md" | "lg";

interface GridProps {
  children: React.ReactNode;
  /** Mínimo width por columna en px. Usa CSS grid auto-fit. */
  minItemWidth?: number;
  gap?: Gap;
  className?: string;
}

const GAP: Record<Gap, string> = {
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
};

/**
 * Grid responsive automático: `repeat(auto-fit, minmax(minItemWidth, 1fr))`.
 * Items se ajustan al ancho disponible y wrappean sin media queries.
 * Para grids con count fijo por breakpoint, usá Tailwind grid-cols directamente.
 */
export function Grid({
  children,
  minItemWidth = 240,
  gap = "md",
  className = "",
}: GridProps) {
  return (
    <div
      className={["grid", className].filter(Boolean).join(" ")}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}px, 100%), 1fr))`,
        gap: GAP[gap],
      }}
    >
      {children}
    </div>
  );
}
