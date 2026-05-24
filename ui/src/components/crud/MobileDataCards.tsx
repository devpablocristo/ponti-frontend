import { Fragment, type ReactNode } from "react";

import type { Column } from "../../pages/admin/types";

type MobileDataCardsProps<T> = {
  columns: Column<T>[];
  data: T[];
  /** Render del bloque de acciones por fila (mismo callback que DataTable). */
  renderActions?: (item: T) => ReactNode;
  /** Columna usada como título principal de la card. Default: primera. */
  primaryKey?: keyof T;
  /** Key estable por fila. Default: index. */
  rowKey?: (item: T, index: number) => string | number;
  /** Mensaje cuando `data` está vacío. */
  emptyMessage?: string;
  className?: string;
};

function valueFor<T>(item: T, col: Column<T>): ReactNode {
  const raw = (item as Record<string, unknown>)[col.key as string];
  if (col.render) return col.render(raw, item);
  if (raw === null || raw === undefined || raw === "") return "—";
  return String(raw);
}

/**
 * Render alternativo para DataTable cuando estamos en mobile: cada fila se
 * pinta como una card con el título (primary column) arriba y el resto de
 * columnas como pares `header: value` en dl/dt/dd. Misma `Column<T>` config
 * — no se duplica nada, no hay branching de schema.
 */
export function MobileDataCards<T>({
  columns,
  data,
  renderActions,
  primaryKey,
  rowKey,
  emptyMessage = "Sin resultados",
  className = "",
}: MobileDataCardsProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={`px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400 ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  const primary = primaryKey ?? columns[0]?.key;
  const primaryCol = primary ? columns.find((c) => c.key === primary) : undefined;
  const restColumns = primary ? columns.filter((c) => c.key !== primary) : columns;

  return (
    <div className={`flex flex-col gap-3 p-3 ${className}`}>
      {data.map((item, i) => (
        <div
          key={rowKey ? rowKey(item, i) : i}
          className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm"
        >
          {primaryCol && (
            <div className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              {valueFor(item, primaryCol)}
            </div>
          )}
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-sm">
            {restColumns.map((col) => (
              <Fragment key={String(col.key)}>
                <dt className="text-slate-500 dark:text-slate-400">{col.header}</dt>
                <dd className="break-words text-slate-900 dark:text-slate-100">
                  {valueFor(item, col)}
                </dd>
              </Fragment>
            ))}
          </dl>
          {renderActions && (
            <div className="mt-3 flex justify-end">{renderActions(item)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
