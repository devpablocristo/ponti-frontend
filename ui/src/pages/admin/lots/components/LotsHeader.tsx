import { useState } from "react";

import { ColumnConfigHeader } from "../../../../components/crud/ColumnConfigHeader";
import { LotsData } from "../../../../hooks/useLots/types";
import { Column } from "../../types";

type LotsHeaderProps = {
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

/**
 * Header de Lots: ColumnConfigHeader compartido + tabs específicos para
 * cambiar el preset de columnas (Siembra/Cosecha/Comercialización).
 * El click en tab reemplaza el conjunto canónico de columnas visibles.
 */
export function LotsHeader({
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  columns,
  harvestColumns,
  commercializationColumns,
  allColumns,
}: LotsHeaderProps) {
  const [active, setActive] = useState<TabName>("Siembra");

  const columnsForTab = (tab: TabName) => {
    if (tab === "Cosecha") return harvestColumns;
    if (tab === "Comercialización") return commercializationColumns;
    return columns;
  };

  const selectTab = (nextActive: TabName) => {
    const keys = columnsForTab(nextActive).map((c) => c.key);
    setActive(nextActive);
    setVisibleColumns(keys);
    setSelectedColumns(keys);
  };

  const tabsStrip = (
    <div className="inline-flex flex-wrap rounded-md shadow-xs" role="group">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          type="button"
          className={[
            "border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium transition-colors duration-150 focus:z-10 focus:outline-none sm:px-4",
            index === 0 ? "rounded-s-lg" : "",
            index === tabs.length - 1 ? "rounded-e-lg" : "",
            index > 0 ? "border-l-0" : "",
            active === tab
              ? "bg-custom-btn text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-gray-600 hover:bg-gray-50 dark:bg-slate-900 hover:text-gray-900 dark:text-gray-100",
          ].join(" ")}
          onClick={() => selectTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <ColumnConfigHeader<LotsData>
      allColumns={allColumns}
      selectedColumns={selectedColumns}
      setSelectedColumns={setSelectedColumns}
      setVisibleColumns={setVisibleColumns}
      leading={tabsStrip}
    />
  );
}
