import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import Button from "../Button/Button";
import { BaseModal } from "../Modal/BaseModal";
import type { Column } from "../../pages/admin/types";

type ColumnConfigHeaderProps<T> = {
  allColumns: Column<T>[];
  selectedColumns: Array<keyof T>;
  setSelectedColumns: (cols: Array<keyof T>) => void;
  setVisibleColumns: (cols: Array<keyof T>) => void;
  /** Contenido opcional renderizado a la izquierda (tabs, breadcrumbs, etc.). */
  leading?: React.ReactNode;
  className?: string;
};

/**
 * Header reutilizable para DataTables: botón "Configurar Columnas" +
 * modal con checkboxes para visibilidad por columna. Sustituye 3
 * implementaciones byte-a-byte idénticas (LotsHeader, LaborsHeader,
 * OrdersHeader). El slot `leading` permite renderizar UI específica del
 * caller (ej. tabs de Lots) sin duplicar el modal.
 *
 * Mobile-friendly: si `leading` overflowea, hace wrap; el botón mantiene
 * tamaño mínimo de tap target.
 */
export function ColumnConfigHeader<T>({
  allColumns,
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  leading,
  className = "",
}: ColumnConfigHeaderProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-gray-100 bg-white dark:bg-slate-800 p-4 ${className}`}
    >
      {leading ?? <div />}
      <Button
        variant="primary"
        size="sm"
        iconLeft={<SlidersHorizontal className="mr-2 h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        Configurar Columnas
      </Button>
      <BaseModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title=""
        primaryButtonText="Aplicar"
        primaryButtonColor="bg-blue-600 hover:bg-blue-800 focus:ring-blue-300 dark:focus:ring-blue-800"
        onPrimaryAction={() => {
          setVisibleColumns(selectedColumns);
          setOpen(false);
        }}
        secondaryButtonText="Cancelar"
        onSecondaryAction={() => setOpen(false)}
      >
        <h3 className="mb-4 text-lg font-semibold">Columnas</h3>
        <div className="mt-4 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto px-2 sm:grid-cols-3">
          {allColumns.map((col) => (
            <label
              key={String(col.key)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns([...selectedColumns, col.key]);
                  } else {
                    setSelectedColumns(selectedColumns.filter((k) => k !== col.key));
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              {col.header}
            </label>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}
