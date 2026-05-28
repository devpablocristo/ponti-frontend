import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import Button from "../../../../components/Button/Button";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import { LotsData } from "../../../../hooks/useLots/types";
import { Column } from "../../types";

type LegacyLotsHeaderProps = {
  fieldsAmount: number;
  lotsAmount: number;
  selectedColumns: Array<keyof LotsData>;
  setSelectedColumns: (columns: Array<keyof LotsData>) => void;
  setVisibleColumns: (columns: Array<keyof LotsData>) => void;
  columns: Column<LotsData>[];
  harvestColumns: Column<LotsData>[];
  commercializationColumns: Column<LotsData>[];
  allColumns: Column<LotsData>[];
};

const tabs = ["Siembra", "Cosecha", "Comercialización"] as const;
type TabName = (typeof tabs)[number];

export function LegacyLotsHeader({
  fieldsAmount,
  lotsAmount,
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  columns,
  harvestColumns,
  commercializationColumns,
  allColumns,
}: LegacyLotsHeaderProps) {
  const [active, setActive] = useState<TabName>("Siembra");
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  const selectTab = (nextActive: TabName, nextColumns: Column<LotsData>[]) => {
    const keys = nextColumns.map((column) => column.key);
    setActive(nextActive);
    setVisibleColumns(keys);
    setSelectedColumns(keys);
  };

  const columnsForTab = (tab: TabName) => {
    if (tab === "Cosecha") return harvestColumns;
    if (tab === "Comercialización") return commercializationColumns;
    return columns;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="text-sm text-gray-900 dark:text-slate-100">
        <span className="font-semibold">Campos:</span> {fieldsAmount}{" "}
        <span className="font-semibold">Lotes:</span> {lotsAmount}
      </div>

      <div className="inline-flex rounded-md shadow-xs" role="group">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={[
              "border border-gray-200 px-4 py-2 text-sm font-medium transition-colors duration-150 focus:z-10 focus:outline-none dark:border-slate-700",
              index === 0 ? "rounded-s-lg" : "",
              index === tabs.length - 1 ? "rounded-e-lg" : "",
              index > 0 ? "border-l-0" : "",
              active === tab
                ? "bg-custom-btn text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
            ].join(" ")}
            onClick={() => selectTab(tab, columnsForTab(tab))}
          >
            {tab}
          </button>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        iconLeft={<SlidersHorizontal className="mr-2 h-4 w-4" />}
        onClick={() => setShowColumnsModal(true)}
      >
        Configurar columnas
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
        <h3 className="mb-4 text-lg font-semibold">Columnas</h3>
        <div className="mt-4 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto px-2 md:grid-cols-3">
          {allColumns.map((column) => (
            <label
              key={String(column.key)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(column.key)}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedColumns([...selectedColumns, column.key]);
                    return;
                  }
                  setSelectedColumns(
                    selectedColumns.filter((key) => key !== column.key)
                  );
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {column.header}
            </label>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}
