import React from "react";

type Size = "sm" | "md" | "lg" | "xl" | "full";
type Padding = "none" | "sm" | "md" | "lg";

interface ContainerProps {
  children: React.ReactNode;
  size?: Size;
  padding?: Padding;
  className?: string;
}

const SIZE: Record<Size, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  full: "max-w-full",
};

const PADDING: Record<Padding, string> = {
  none: "",
  sm: "px-3 md:px-4",
  md: "px-4 md:px-6",
  lg: "px-4 md:px-8 lg:px-12",
};

/**
 * Centra contenido con max-width responsive y padding horizontal sano.
 * Usar como wrapper de página/sección, no como reemplazo de Stack/Grid.
 */
export function Container({
  children,
  size = "xl",
  padding = "md",
  className = "",
}: ContainerProps) {
  return (
    <div className={["mx-auto w-full", SIZE[size], PADDING[padding], className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
