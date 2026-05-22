import { Skeleton } from "./Skeleton";

type FormSkeletonProps = {
  /** Cantidad de campos placeholder (default 5). */
  fields?: number;
  /** Mostrar barra de botones al final. */
  showActions?: boolean;
  className?: string;
};

/**
 * Placeholder para drawers/forms mientras cargan datos del entity.
 * Cada "campo" es label + input placeholder.
 */
export function FormSkeleton({
  fields = 5,
  showActions = true,
  className = "",
}: FormSkeletonProps) {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Cargando formulario"
    >
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showActions ? (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      ) : null}
      <span className="sr-only">Cargando formulario…</span>
    </div>
  );
}
