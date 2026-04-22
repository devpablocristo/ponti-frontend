import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Pencil } from "lucide-react";

import { DataTable } from "@devpablocristo/modules-ui-data-display";
import { FilterBar } from "@devpablocristo/modules-ui-filters";

import { apiClient } from "@/api/client";
import { Summary } from "@/api/types";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import useStock from "../../../hooks/useStock";
import { GetStockItems } from "../../../hooks/useStock/types";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { Column } from "../types";
import { getUnitName } from "../../../constants/units";
import { formatNumberAr, normalizeNumber } from "../utils";
import CreateStockItem from "./CreateStockItem";

const EditableCell = ({
  item,
  value,
  projectId,
  onSaved,
}: {
  item: GetStockItems;
  value: string | number;
  projectId: number | null;
  onSaved?: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const { updateStock, processingStock, errorStock, resultStock } = useStock();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value, item.supply_id]);

  const save = async () => {
    if (editValue === "" || projectId === null) {
      return;
    }
    updateStock(projectId, item.supply_id, Number(editValue));
  };

  useEffect(() => {
    if (errorStock) {
      alert(errorStock);
      return;
    }
    if (resultStock) {
      setEditing(false);
      onSaved?.();
    }
  }, [errorStock, resultStock, onSaved]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="any"
          className="block w-full min-w-[80px] p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={processingStock}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              save();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
        />
        {processingStock ? (
          <LoaderCircle className="animate-spin w-4 h-4 text-blue-500" />
        ) : (
          <button className="text-green-600 hover:text-green-800" onClick={save}>
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full min-w-[80px]">
      <input
        type="number"
        min="0"
        className="block w-full p-2 text-gray-800 border border-gray-300 rounded-lg bg-gray-100 text-sm"
        value={value}
        onChange={() => {}}
        disabled
      />
      <button
        className="text-blue-600 hover:text-blue-800 flex items-center p-1"
        style={{ minWidth: 24, minHeight: 24 }}
        onClick={() => setEditing(true)}
        aria-label="Editar"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

function ItemsIndicators({ summary }: { summary: Summary }) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IndicatorCard
          title="Total invertido Kg"
          value={formatNumberAr(summary.total_kg) + " Kg"}
          color="gray"
        />
        <IndicatorCard
          title="Total invertido Lt"
          value={formatNumberAr(summary.total_lt) + " Lt"}
          color="gray"
        />
        <IndicatorCard
          title="Total u$ / Neto"
          value={"u$ " + formatNumberAr(summary.total_usd)}
          color="red"
        />
      </div>
    </div>
  );
}

export function Stock() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

  const { projectId, filters, selectedCustomer, selectedCampaignId, customers } =
    useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const { getStock, stock, processing, error } = useStock();

  const refreshStock = useCallback(() => {
    if (!projectId) return;
    getStock(projectId, "");
  }, [getStock, projectId]);

  const handleStockCreated = () => {
    if (!projectId) return;
    setCurrentPage(1);
    refreshStock();
  };

  useEffect(() => {
    if (!projectId || !selectedCustomer || !selectedCampaignId) {
      return;
    }
    setCurrentPage(1);
    getStock(projectId, "");
  }, [getStock, projectId, selectedCustomer, selectedCampaignId]);

  const filteredStock = useMemo(() => {
    return (Array.isArray(stock) ? stock : []).filter((item) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }

        const itemValue = String(item[key as keyof GetStockItems] ?? "").toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) => itemValue.includes(String(v).toLowerCase()));
        }

        return itemValue.includes(String(value).toLowerCase());
      });
    });
  }, [stock, columnsFilters]);

  const derivedSummary: Summary = useMemo(() => {
    let totalKg = 0;
    let totalLt = 0;
    let totalUsd = 0;

    filteredStock.forEach((item) => {
      const entry = Number(item.entry_stock) || 0;
      const usd = Number(item.total_usd) || 0;

      if (item.supply_unit_id === 1) {
        totalLt += entry;
      } else if (item.supply_unit_id === 2) {
        totalKg += entry;
      }

      totalUsd += usd;
    });

    return {
      total_kg: totalKg,
      total_lt: totalLt,
      total_usd: totalUsd,
    };
  }, [filteredStock]);

  function getFilterOptionsForColumn(
    key: keyof GetStockItems,
    stockItems: GetStockItems[],
    filtersState: Record<string, unknown>
  ) {
    const otherFilters = { ...filtersState };
    delete otherFilters[key];

    const filtered = stockItems.filter((item) =>
      Object.entries(otherFilters).every(([filterKey, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const itemValue = String(item[filterKey as keyof GetStockItems] ?? "").toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) => itemValue.includes(String(v).toLowerCase()));
        }

        return itemValue.includes(String(value).toLowerCase());
      })
    );

    return [...new Set(filtered.map((item) => String(item[key] ?? "")))].filter(Boolean);
  }

  const columns: Column<GetStockItems>[] = useMemo(
    () => [
      {
        key: "supply_name",
        header: "Insumo",
        minWidth: "300px",
        wrap: true,
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("supply_name", stock, columnsFilters),
        render: (value) => (
          <span className="font-semibold text-gray-900">{String(value ?? "")}</span>
        ),
      },
      {
        key: "class_type",
        header: "Rubro",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("class_type", stock, columnsFilters),
      },
      {
        key: "entry_stock",
        padding: "xs",
        headerPadding: "xs",
        header: "Ingresados",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("entry_stock", stock, columnsFilters),
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return (
            <span className="font-bold text-blue-700">
              {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
              <span className="text-blue-700 font-bold text-xs">{unit}</span>
            </span>
          );
        },
      },
      {
        key: "out_stock",
        padding: "xs",
        headerPadding: "xs",
        header: "Salidos",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("out_stock", stock, columnsFilters),
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return (
            <span className="font-bold text-blue-700">
              {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
              <span className="text-blue-700 font-bold text-xs">{unit}</span>
            </span>
          );
        },
      },
      {
        key: "consumed",
        header: "Consumidos",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("consumed", stock, columnsFilters),
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return (
            <span className="font-bold text-blue-700">
              {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
              <span className="text-blue-700 font-bold text-xs">{unit}</span>
            </span>
          );
        },
      },
      {
        key: "stock_units",
        header: "Stock de sistema",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("stock_units", stock, columnsFilters),
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return (
            <span className="font-bold text-blue-700">
              {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
              <span className="text-blue-700 font-bold text-xs">{unit}</span>
            </span>
          );
        },
      },
      {
        key: "real_stock_units",
        header: "Stock físico",
        headerPadding: "xs",
        filterable: false,
        render: (value, item) => (
          <EditableCell
            item={item}
            value={typeof value === "string" || typeof value === "number" ? value : ""}
            projectId={projectId}
            onSaved={refreshStock}
          />
        ),
      },
      {
        key: "stock_difference",
        header: "Diferencia",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("stock_difference", stock, columnsFilters),
        render: (diff) => {
          const value = normalizeNumber(diff);

          if (Number.isNaN(value)) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                -
              </span>
            );
          }

          if (value === 0) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                0
              </span>
            );
          }

          if (value > 0) {
            return (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border"
                style={{
                  color: "var(--color-success)",
                  backgroundColor: "var(--color-success-light)",
                  borderColor: "rgba(16, 185, 129, 0.35)",
                }}
              >
                <Check className="w-3.5 h-3.5" />+{formatNumberAr(Math.abs(value))}
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {formatNumberAr(value)}
            </span>
          );
        },
      },
      {
        key: "last_count_at",
        header: "Último conteo",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("last_count_at", stock, columnsFilters),
        render: (value) => {
          if (!value) return " - ";
          const date = new Date(String(value));
          return <strong>{date.toLocaleDateString("es-AR")}</strong>;
        },
      },
      {
        key: "supply_unit_price",
        header: "Precio U.",
        padding: "xs",
        headerPadding: "xs",
        filterable: false,
        render: (value) => (
          <span className="font-semibold text-emerald-700">
            u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "total_usd",
        header: "Total u$",
        padding: "xs",
        headerPadding: "xs",
        filterable: false,
        render: (value) => {
          const num = Number(value);
          return (
            <span className="font-bold text-emerald-700">
              {isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}
            </span>
          );
        },
      },
    ],
    [columnsFilters, projectId, refreshStock, stock]
  );

  const handleExport = async () => {
    if (!projectId) return;

    try {
      setExportErrorMessage(null);
      const response = await apiClient.get<Blob>(
        `/stock/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportErrorMessage("No se pudo exportar el stock.");
    }
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar Stock",
            icon: (
              <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "+ Registrar conteo físico",
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => setDrawerOpen(true),
          },
        ]}
      />

      {!error && projectId && selectedCustomer && selectedCampaignId && (
        <div className="my-4">
          <ItemsIndicators summary={derivedSummary} />
        </div>
      )}

      <div className="mt-4 relative">
        {processing && (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        )}

        {(error || exportErrorMessage) && (
          <div className="flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200" role="alert">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <span className="font-semibold">Error:</span> {exportErrorMessage || error}
            </div>
          </div>
        )}

        {projectId && customers && (
          <CreateStockItem
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            projectId={projectId}
            onStockCreated={handleStockCreated}
          />
        )}

        {projectId && selectedCustomer && selectedCampaignId && (
          <DataTable
            data={filteredStock}
            columns={columns}
            message="No hay stock disponible"
            filters={columnsFilters}
            onFilterChange={(nextFilters) => {
              setColumnsFilters(nextFilters);
              setCurrentPage(1);
            }}
            enableFilters
            pagination={{
              page: currentPage,
              perPage: itemsPerPage,
              total: filteredStock.length,
              onPageChange: setCurrentPage,
            }}
          />
        )}
      </div>
    </div>
  );
}
