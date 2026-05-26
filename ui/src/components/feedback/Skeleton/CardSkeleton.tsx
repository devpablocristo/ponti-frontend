import { Skeleton } from "./Skeleton";

type CardSkeletonProps = {
  /** Cantidad de cards en grid (default 4). Útil para KPI rows. */
  count?: number;
  /** Si cada card muestra solo título o título + valor + descripción. */
  variant?: "minimal" | "metric";
  className?: string;
};

/**
 * Placeholder para grids de KPI cards (Dashboard, reports). Cada card es
 * un rectángulo redondeado con varios skeletons internos.
 */
export function CardSkeleton({
  count = 4,
  variant = "metric",
  className = "",
}: CardSkeletonProps) {
  return (
    <div
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}
      role="status"
      aria-label="Cargando indicadores"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <Skeleton className="mb-3 h-4 w-1/2" />
          {variant === "metric" ? (
            <>
              <Skeleton className="mb-2 h-8 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </>
          ) : null}
        </div>
      ))}
      <span className="sr-only">Cargando indicadores…</span>
    </div>
  );
}
