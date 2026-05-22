import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import { OrdersData } from "../../../../hooks/useWorkOrders/types";
import { Column } from "../../types";

type OrdersHeaderProps = {
  selectedColumns: Array<keyof OrdersData>;
  setSelectedColumns: (columns: Array<keyof OrdersData>) => void;
  setVisibleColumns: (columns: Array<keyof OrdersData>) => void;
  allColumns: Column<OrdersData>[];
};

/**
 * Header del DataTable de WorkOrders. Renderiza el botón "Configurar Columnas"
 * y el modal interno con checkboxes de columnas visibles. Estado local
 * (showColumnsModal) — no propaga al parent.
 */
export function OrdersHeader({
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  allColumns,
}: OrdersHeaderProps) {
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  return (
    <div className="flex justify-end items-center p-4 bg-white dark:bg-slate-800 rounded-t-xl border-b border-gray-100">
      <Button
        variant="primary"
        size="sm"
        iconLeft={<SlidersHorizontal className="mr-2 h-4 w-4" />}
        onClick={() => setShowColumnsModal(true)}
      >
        Configurar Columnas
      </Button>
      <BaseModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title=""
        primaryButtonText="Aplicar"
        primaryButtonColor="bg-blue-600 hover:bg-blue-800 focus:ring-blue-300 dark:focus:ring-blue-800"
        onPrimaryAction={() => {
          setVisibleColumns(selectedColumns);
          setShowColumnsModal(false);
        }}
        secondaryButtonText="Cancelar"
        onSecondaryAction={() => setShowColumnsModal(false)}
      >
        <h3 className="text-lg font-semibold mb-4">Columnas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto px-2 mt-4">
          {allColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 gap-2"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns([...selectedColumns, col.key]);
                  } else {
                    setSelectedColumns(
                      selectedColumns.filter((k) => k !== col.key)
                    );
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              {col.header}
            </label>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}
