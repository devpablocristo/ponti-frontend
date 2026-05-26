import { type ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  /** Si true (default), aplica animación shimmer. Útil desactivarla para
   * placeholders estáticos dentro de modales. */
  animate?: boolean;
};

/**
 * Skeleton primitivo: bloque gris con animación pulse. Cualquier composición
 * (TableSkeleton, CardSkeleton, etc.) se arma combinando varias instancias
 * de este primitivo.
 *
 * Reemplaza el patrón `<LoadingOverlay>` para mejor UX (el usuario ve la
 * forma de la página en lugar de un spinner sobre fondo gris).
 */
export function Skeleton({ className = "", animate = true }: SkeletonProps) {
  const animation = animate ? "animate-pulse" : "";
  return (
    <div
      className={`rounded bg-gray-200 dark:bg-slate-700 ${animation} ${className}`}
      aria-hidden="true"
    />
  );
}

type SkeletonWrapperProps = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
};

/**
 * Helper: muestra `skeleton` mientras `loading=true`, sino renderiza
 * `children`. Evita el if-else inline en cada page.
 */
export function SkeletonWrapper({ loading, skeleton, children }: SkeletonWrapperProps) {
  return <>{loading ? skeleton : children}</>;
}
