import { Skeleton } from "./Skeleton";

type TableSkeletonProps = {
  /** Cantidad de filas de placeholder (default 8). */
  rows?: number;
  /** Cantidad de columnas (default 6). */
  columns?: number;
  /** Si se muestra una fila extra arriba con headers más oscuros. */
  showHeader?: boolean;
  className?: string;
};

/**
 * Placeholder para DataTable mientras carga. Muestra una grilla de filas
 * con celdas tipo Skeleton. Match con la altura típica de filas de
 * `@devpablocristo/platform-ui-data-display`.
 */
export function TableSkeleton({
  rows = 8,
  columns = 6,
  showHeader = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div
      className={`w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${className}`}
      role="status"
      aria-label="Cargando tabla"
    >
      {showHeader ? (
        <div className="mb-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-3/4 bg-gray-300 dark:bg-slate-600" />
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-3 border-b border-gray-100 py-3 last:border-b-0 dark:border-slate-700"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando contenido…</span>
    </div>
  );
}
