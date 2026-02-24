import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Pencil, Check, AlertCircle } from "lucide-react";

import DataTable from "../../../components/Table/DataTable";
import useStock from "../../../hooks/useStock";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { GetStockItems } from "../../../hooks/useStock/types";
import { Summary } from "@/api/types";
import { BaseModal } from "../../../components/Modal/BaseModal";
import { Column } from "../types";
import SelectField from "../../../components/Input/SelectField";
import { apiClient } from "@/api/client";
import { formatNumberAr } from "../utils";
import CreateStockItem from "./CreateStockItem";
import { getUnitName } from "../../../constants/units";

const EditableCell = ({
  item,
  value,
  projectId,
  onSaved,
}: {
  item: any;
  value: string | number;
  projectId: number | null;
  onSaved?: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const { updateStock, processingStock, errorStock, resultStock } = useStock();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value, item.id]);

  const save = async () => {
    if (editValue === "") {
      return;
    }
    if (projectId === null) {
      alert("Error al guardar");
      return;
    }
    updateStock(projectId, item.id, Number(editValue));
  };

  useEffect(() => {
    if (errorStock) {
      alert(errorStock);
      return;
    }
    if (resultStock) {
      setEditing(false);
      onSaved?.();
      return;
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
          <button
            className="text-green-600 hover:text-green-800"
            onClick={save}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
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
        onChange={() => { }}
        disabled={true}
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

function CloseStockDate({
  date,
  onDateChange,
  enabledCloseStock,
  setEnabledCloseStock,
  disabledCloseStock,
}: {
  date: string;
  onDateChange: (date: string) => void;
  enabledCloseStock: boolean;
  setEnabledCloseStock: (enabled: boolean) => void;
  disabledCloseStock: boolean;
}) {
  const [internalDate, setInternalDate] = useState(date);

  useEffect(() => {
    setInternalDate(date);
  }, [date]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1.5 w-full bg-gray-900" />
      <div className="px-4 py-3">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
          Cerrar stock a fecha
        </label>
        <div className="flex items-center gap-3">
        <input
          type="date"
          disabled={disabledCloseStock}
          value={internalDate}
          onChange={(e) => setInternalDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-custom-btn/30 focus:border-custom-btn disabled:bg-gray-100 disabled:text-gray-400"
        />
          <label className={`inline-flex items-center gap-2 cursor-pointer ${disabledCloseStock ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input
              type="checkbox"
              checked={enabledCloseStock}
              onChange={() => {
                if (!enabledCloseStock && internalDate) {
                  setEnabledCloseStock(true);
                  onDateChange(internalDate);
                } else {
                  setEnabledCloseStock(false);
                }
              }}
              className="w-4 h-4 text-custom-btn border-gray-300 rounded focus:ring-custom-btn/30"
              disabled={disabledCloseStock}
            />
            <span className="text-xs font-semibold text-gray-600">Cerrar stock</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ItemsIndicators({
  summary,
  selectedDate,
  onDateChange,
  enabledCloseStock,
  setEnabledCloseStock,
  disabledCloseStock,
}: {
  summary: Summary;
  selectedDate: string;
  onDateChange: (date: string) => void;
  enabledCloseStock: boolean;
  setEnabledCloseStock: (enabled: boolean) => void;
  disabledCloseStock: boolean;
}) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <CloseStockDate
          date={selectedDate}
          onDateChange={onDateChange}
          enabledCloseStock={enabledCloseStock}
          setEnabledCloseStock={setEnabledCloseStock}
          disabledCloseStock={disabledCloseStock}
        />
      </div>
    </div>
  );
}

export function Stock() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [columnsFilters, setColumnsFilters] = useState<Record<string, any>>({});
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );
  const [disabledCloseStock, setDisabledCloseStock] = useState(false);
  const [enabledCloseStock, setEnabledCloseStock] = useState(false);
  const [stockPeriods, setStockPeriods] = useState<
    {
      id: number;
      name: string;
    }[]
  >([{ id: 0, name: "Activo" }]);

  const [period, setPeriod] = useState("0");

  const [drawerOpen, setDrawerOpen] = useState(false);

  const { projectId, filters, selectedCustomer, selectedCampaignId, customers } =
    useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const {
    getStock,
    stock,
    processing,
    error,
    closeStock,
    processingCloseStock,
    errorCloseStock,
    resultCloseStock,
    getPeriods,
    errorPeriods,
    periods,
  } = useStock();

  const refreshStock = useCallback(() => {
    if (!projectId) return;
    getStock(
      projectId,
      period === "0" ? "" : stockPeriods[Number(period)]?.name || ""
    );
  }, [getStock, period, projectId, stockPeriods]);

  const handleStockCreated = () => {
    if (!projectId) return;
    setCurrentPage(1);
    refreshStock();
  };

  const filteredStock = useMemo(() => {
    return (Array.isArray(stock) ? stock : []).filter((item) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }

        const itemValue = String(item[key as keyof GetStockItems] ?? "")
          .toLowerCase();

        // 🟢 MULTI SELECT
        if (Array.isArray(value)) {
          return value.some((v) =>
            itemValue.includes(String(v).toLowerCase())
          );
        }

        // 🟢 SINGLE SELECT
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
    stock: GetStockItems[],
    filters: Record<string, any>
  ) {
    const otherFilters = { ...filters };
    delete otherFilters[key];

    const filtered = stock.filter((item) =>
      Object.entries(otherFilters).every(([k, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const itemValue = String(item[k as keyof GetStockItems] ?? "").toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) =>
            itemValue.includes(String(v).toLowerCase())
          );
        }

        return itemValue.includes(String(value).toLowerCase());
      })
    );

    return [...new Set(filtered.map((i) => String(i[key] ?? "")))].filter(Boolean);
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
        filterOptions: getFilterOptionsForColumn(
          "supply_name",
          stock,
          columnsFilters
        ),
        render: (value: any) => <span className="font-semibold text-gray-900">{value}</span>,
      },
      {
        key: "class_type",
        header: "Rubro",
        padding: "xs",
        headerPadding: "xs",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "class_type",
          stock,
          columnsFilters
        ),
      },
      {
        key: "investor_name",
        header: "Inversor",
        filterable: true,
        padding: "xs",
        headerPadding: "xs",
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "investor_name",
          stock,
          columnsFilters
        ),
      },
      {
        key: "entry_stock",
        padding: "xs",
        filterable: true,
        filterType: "select",
        headerPadding: "xs",
        filterOptions: getFilterOptionsForColumn(
          "entry_stock",
          stock,
          columnsFilters
        ),
        header: "Ingresados",
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return <span className="font-bold text-blue-700">{formatNumberAr(value)} <span className="text-blue-700 font-bold text-xs">{unit}</span></span>;
        },
      },
      {
        key: "consumed",
        filterable: true,
        header: "Consumidos",
        padding: "xs",
        headerPadding: "xs",
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return <span className="font-bold text-blue-700">{formatNumberAr(value)} <span className="text-blue-700 font-bold text-xs">{unit}</span></span>;
        },
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "consumed",
          stock,
          columnsFilters
        ),
      },
      {
        key: "stock_units",
        filterable: true,
        header: "Stock de sistema",
        headerPadding: "xs",
        padding: "xs",
        render: (value, item) => {
          const unit = getUnitName(item.supply_unit_id);
          return <span className="font-bold text-blue-700">{formatNumberAr(value)} <span className="text-blue-700 font-bold text-xs">{unit}</span></span>;
        },
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "stock_units",
          stock,
          columnsFilters
        ),
      },
      {
        key: "real_stock_units",
        filterable: false,
        header: "Stock de campo",
        headerPadding: "xs",
        render: (value, item) => (
          <EditableCell
            item={item}
            value={value}
            projectId={projectId}
            onSaved={refreshStock}
          />
        ),
      },
      {
        key: "stock_difference",
        filterable: true,
        filterType: "select",
        padding: "xs",
        headerPadding: "xs",
        filterOptions: getFilterOptionsForColumn(
          "stock_difference",
          stock,
          columnsFilters
        ),
        header: "Diferencia",
        render: (diff, item) => {
          const value = Number(diff);
          const systemStock = Number(item.stock_units) || 0;
          const isNegativeSystemStock = systemStock < 0;
          if (value === 0) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">0</span>;
          }
          if (value > 0) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                +{value}
              </span>
            );
          }
          if (isNegativeSystemStock) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-300">
                <AlertCircle className="w-3.5 h-3.5" />
                {value}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {value}
            </span>
          );
        },
      },
      {
        key: "close_date",
        filterable: true,
        filterType: "select",
        padding: "xs",
        headerPadding: "xs",
        filterOptions: getFilterOptionsForColumn(
          "close_date",
          stock,
          columnsFilters
        ),
        header: "Fecha de cierre",
        render: (dateString) => {
          if (!dateString) return " - ";
          const datePart = dateString.split("T")[0];
          const [year, month, day] = datePart.split("-").map(Number);
          const dayStr = String(day).padStart(2, "0");
          const monthStr = String(month).padStart(2, "0");
          return <strong>{`${dayStr}/${monthStr}/${year}`}</strong>;
        },
      },
      {
        key: "supply_unit_price",
        header: "Precio U.",
        padding: "xs",
        headerPadding: "xs",
        filterable: false,
        render: (value) => <span className="font-semibold text-emerald-700">u$ {formatNumberAr(value)}</span>,
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
    [projectId, stock, columnsFilters, refreshStock]
  );

  useEffect(() => {
    if (!projectId || !selectedCustomer || !selectedCampaignId) {
      return;
    }

    setCurrentPage(1); // 👈 RESET PAGINACIÓN

    getStock(projectId, "");
    getPeriods(projectId);
    setDisabledCloseStock(false);
    setSelectedDate("");
  }, [getStock, projectId, selectedCustomer, selectedCampaignId]);

  useEffect(() => {
    if (periods && periods.length > 0) {
      setStockPeriods((prev) => [
        ...prev,
        ...periods
          .filter((p) => !prev.some((item) => item.name === p))
          .map((p, idx) => ({
            id: prev.length + idx,
            name: p,
          })),
      ]);
    }
  }, [periods]);

  useEffect(() => {
    if (!projectId) return;

    setCurrentPage(1); // 👈 RESET PAGINACIÓN

    const periodNumber = Number(period);
    if (periodNumber === 0) {
      getStock(projectId, "");
      setDisabledCloseStock(false);
      setSelectedDate("");
      return;
    }

    getStock(projectId, stockPeriods[periodNumber]?.name || "");
    setSelectedDate(stockPeriods[periodNumber]?.name || "");
    setDisabledCloseStock(true);
  }, [period, stockPeriods]);

  useEffect(() => {
    if (errorCloseStock) {
      alert(errorCloseStock);
    }
  }, [errorCloseStock]);

  useEffect(() => {
    if (resultCloseStock && projectId) {
      alert(resultCloseStock);
      getStock(projectId, "");
      getPeriods(projectId);
      setEnabledCloseStock(false);
      setDisabledCloseStock(false);
      setSelectedDate("");
    }
  }, [resultCloseStock]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseStock = () => {
    if (projectId === null) {
      return;
    }
    closeStock(projectId, selectedDate);
    setIsModalOpen(false);
  };

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
    } catch (error) {
      setExportErrorMessage("No se pudo exportar el stock.");
    }
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    setColumnsFilters(filters);
    setCurrentPage(1);
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar Stock",
            icon: <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317" stroke="#547792" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ,
            variant: "outlinePonti",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "+ Ingreso de Stock",
            variant: "success",
            isPrimary: true,
            disabled: !projectId || disabledCloseStock,
            onClick: () => setDrawerOpen(true),
          },
        ]}
      />
      {!error && projectId && selectedCustomer && selectedCampaignId && (
        <div className="my-4">
          <ItemsIndicators
            summary={derivedSummary}
            selectedDate={selectedDate}
            disabledCloseStock={disabledCloseStock}
            onDateChange={handleDateChange}
            enabledCloseStock={enabledCloseStock}
            setEnabledCloseStock={setEnabledCloseStock}
          />
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
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
            <div><span className="font-semibold">Error:</span> {exportErrorMessage || error}</div>
          </div>
        )}
        {stockPeriods && stockPeriods.length > 0 && (
          <div className="mb-4">
            <SelectField
              label="Periodo (fecha de cierre)"
              name="period"
              options={stockPeriods}
              className="max-w-64"
              value={period}
              size="sm"
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
        )}
        {errorPeriods && (
          <div className="flex items-center gap-2 p-3 mb-3 text-sm text-amber-800 rounded-xl bg-amber-50 border border-amber-200">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            <span>{errorPeriods}</span>
          </div>
        )}
        {projectId && customers && (
          <CreateStockItem
            customers={customers}
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
            onFilterChange={handleFilterChange}
            enableFilters={true}
            pagination={{
              page: currentPage,
              perPage: itemsPerPage,
              total: filteredStock.length,
              onPageChange: handlePageChange,
            }}
          />
        )}
        <BaseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEnabledCloseStock(false);
          }}
          isSaving={processingCloseStock}
          title={"Se va a cerrar el stock"}
          message={`¿Está seguro que desea cerrar el stock a la fecha ${selectedDate
            .split("-")
            .reverse()
            .join("/")}?`}
          primaryButtonText={"Sí, cerrar"}
          secondaryButtonText={"Cancelar"}
          onPrimaryAction={() => {
            handleCloseStock();
          }}
          onSecondaryAction={() => {
            setIsModalOpen(false);
            setEnabledCloseStock(false);
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <p>{`¿Está seguro que desea cerrar el stock a la fecha ${selectedDate
              .split("-")
              .reverse()
              .join("/")}?`}</p>
          </div>
        </BaseModal>
      </div>
    </div>
  );
}
