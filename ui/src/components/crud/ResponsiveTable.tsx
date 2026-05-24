import type { ReactNode } from "react";

import { useIsMobile } from "../../hooks/useBreakpoint";
import { DataTable } from "../../lib/dataDisplay";
import type { Column } from "../../pages/admin/types";
import { MobileDataCards } from "./MobileDataCards";

type ResponsiveTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  /** Render del bloque de acciones por fila — compartido entre table y cards. */
  renderActions?: (item: T) => ReactNode;
  /** Cabecera renderizada arriba (toolbar, tabs, etc.). Visible en ambos modos. */
  headerComponent?: ReactNode;
  /** Mobile-only: columna como título de cada card (default: primera). */
  primaryKey?: keyof T;
  /** Mobile-only: key estable por fila. */
  rowKey?: (item: T, index: number) => string | number;
  /** Mobile-only: mensaje cuando data vacío. */
  emptyMessage?: string;
  /**
   * Resto de props del DataTable upstream (filters, onFilterChange, etc.).
   * Pasan transparente solo en desktop. En mobile las cards son vista compacta
   * sin filtros por columna (filtros globales viven en AppFilterBar).
   */
  [key: string]: unknown;
};

/**
 * Switch responsive entre `DataTable` (desktop) y `MobileDataCards` (mobile)
 * usando `useIsMobile`. Una sola fuente: `columns` config. NO crear un
 * `<MobileTable>` paralelo; este wrapper preserva typing y todos los props
 * del DataTable upstream.
 *
 * Limitación: en mobile no hay filtros per-columna (que la lib externa
 * incluye). Para filtros globales mobile, usar `AppFilterBar` sobre la tabla.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  renderActions,
  headerComponent,
  primaryKey,
  rowKey,
  emptyMessage,
  ...rest
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
        {headerComponent}
        <MobileDataCards<T>
          columns={columns}
          data={data}
          renderActions={renderActions}
          primaryKey={primaryKey}
          rowKey={rowKey}
          emptyMessage={emptyMessage}
        />
      </div>
    );
  }

  // En desktop, pasamos TODOS los props (incluido `rest`) al DataTable
  // existente. El cast a `any` para `columns` es necesario porque el wrapper
  // local acepta `Column<T>[]` (que es estructuralmente igual a
  // `DataTableColumn<T>` de la lib externa pero TS no las unifica solo).
  return (
    <DataTable<T>
      {...(rest as object)}
      data={data}
      columns={columns}
      renderActions={renderActions}
      headerComponent={headerComponent}
    />
  );
}
