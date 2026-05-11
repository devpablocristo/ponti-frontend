import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, LoaderCircle, Pencil, Check, AlertCircle, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import { WarningBanner } from "../../../components/feedback/WarningBanner";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";

import { DataTable, usePagination } from "@/lib/dataDisplay";
import { useNavigate } from "react-router-dom";
import useStock from "../../../hooks/useStock";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { AppFilterBar as FilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { GetStockItems } from "../../../hooks/useStock/types";
import { Summary } from "@/api/types";
import { BaseModal } from "../../../components/Modal/BaseModal";
import { Column } from "../types";
import { SUPPLY_ENTITY } from "../entities";
import SelectField from "../../../components/Input/SelectField";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeNumber } from "../utils";
import CreateStockItem from "./CreateStockItem";
import { getUnitName } from "../../../constants/units";
import ImportSupplyMovements from "../products/ImportSupplyMovements";

const MISSING_INVESTOR_LABEL = "+1 INV.";

type SelectableStockItem = GetStockItems & { id: number };

function getStockFilterValue(item: GetStockItems, key: keyof GetStockItems) {
  const value = item[key];

  if (key === "investor_name" && String(value ?? "").trim() === "") {
    return MISSING_INVESTOR_LABEL;
  }

  return String(value ?? "");
}

const EditableCell = ({
  item,
  value,
  projectId,
  onSaved,
  onValidationError,
}: {
  item: GetStockItems;
  value: string | number;
  projectId: number | null;
  onSaved?: () => void;
  onValidationError: (message: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const savingRef = useRef(false);
  const { updateStock, processingStock, errorStock, resultStock } = useStock();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value, item.id]);

  const save = async () => {
    if (savingRef.current || processingStock) {
      return;
    }

    if (editValue === "") {
      return;
    }

    if (projectId === null) {
      alert("Error al guardar");
      return;
    }

    if (item.has_multiple_investors) {
      onValidationError(
        "Existe más de un inversor asociado a este insumo. Corrobore los ingresos y asignaciones antes de cerrar stock."
      );
      return;
    }

    if (!item.id || item.id <= 0) {
      onValidationError(
        "Para cargar stock de campo, primero cargá un ingreso del insumo."
      );
      return;
    }

    savingRef.current = true;
    try {
      await updateStock(projectId, item.id, Number(editValue), item.updated_at);
    } finally {
      savingRef.current = false;
    }
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
  const navigate = useNavigate();
  const pagination = usePagination({ perPage: 10 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [stockValidationModal, setStockValidationModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
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
    pagination.resetPage();
    refreshStock();
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!projectId) {
      setActionErrorMessage("Seleccione un proyecto antes de importar stock.");
      return;
    }

    setActionErrorMessage(null);
    setSuccessMessage(null);
    setPendingImportFile(file);
    setImportDrawerOpen(true);
  };

  const handleStockImported = (message: string) => {
    setSuccessMessage(message);
    setActionErrorMessage(null);
    setPendingImportFile(null);
    setImportDrawerOpen(false);
    handleStockCreated();
  };

  const handleViewConsumingOrders = useCallback(
    (item: GetStockItems) => {
      if (!projectId || !item.supply_id) return;

      const params = new URLSearchParams({
        project_id: String(projectId),
        supply_id: String(item.supply_id),
        supply_name: item.supply_name,
      });
      navigate(`/admin/work-orders?${params.toString()}`);
    },
    [navigate, projectId]
  );

  const filteredStock = useMemo(() => {
    return (Array.isArray(stock) ? stock : []).filter((item) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }

        const itemValue = getStockFilterValue(
  item,
  key as keyof GetStockItems
).toLowerCase();

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

  const selectableStock = useMemo<SelectableStockItem[]>(
    () => filteredStock.filter((item): item is SelectableStockItem => Number(item.id) > 0),
    [filteredStock],
  );

  const bulk = useBulkSelection<SelectableStockItem>(selectableStock);

  const bulkActions = useMemo(
    () => {
      const actions = [];
      if (bulk.selectedCount === 1 && bulk.selectedItems[0]) {
        actions.push({
          label: "Editar",
          icon: Pencil,
          onClick: () => {
            setStockValidationModal({
              title: "Editar stock",
              message:
                "Para editar este stock usá la columna Stock de campo de la fila seleccionada.",
            });
          },
        });
      }
      actions.push({
        label: `Archivar ${bulk.selectedCount}`,
        icon: Archive,
        onClick: () => {
          setStockValidationModal({
            title: "Stock calculado",
            message:
              "El saldo de stock no se archiva desde esta tabla. Archivá el movimiento de insumo o el cierre que lo generó.",
          });
        },
      });
      return actions;
    },
    [bulk.selectedCount, bulk.selectedItems],
  );

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
    filters: Record<string, unknown>
  ) {
    const otherFilters = { ...filters };
    delete otherFilters[key];

    const filtered = stock.filter((item) =>
      Object.entries(otherFilters).every(([k, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const itemValue = getStockFilterValue(
  item,
  k as keyof GetStockItems
).toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) =>
            itemValue.includes(String(v).toLowerCase())
          );
        }

        return itemValue.includes(String(value).toLowerCase());
      })
    );

    return [...new Set(filtered.map((i) => getStockFilterValue(i, key)))].filter(
  Boolean
);
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
        render: (value, item) => (
          <button
            type="button"
            className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline"
            title="Ver órdenes que consumen este insumo"
            onClick={() => handleViewConsumingOrders(item)}
          >
            {String(value ?? "")}
          </button>
        ),
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
  render: (value) => {
    const investorName = String(value ?? "").trim();

    if (!investorName) {
      return (
        <span className="font-semibold text-red-600">
          {MISSING_INVESTOR_LABEL}
        </span>
      );
    }

    return <span>{investorName}</span>;
  },
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
          return <span className="font-bold text-gray-900">{formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)} <span className="text-gray-900 font-bold text-xs">{unit}</span></span>;
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
          return <span className="font-bold text-gray-900">{formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)} <span className="text-gray-900 font-bold text-xs">{unit}</span></span>;
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
          return <span className="font-bold text-gray-900">{formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)} <span className="text-gray-900 font-bold text-xs">{unit}</span></span>;
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
            value={typeof value === "string" || typeof value === "number" ? value : ""}
            projectId={projectId}
            onSaved={refreshStock}
            onValidationError={(message) =>
              setStockValidationModal({
                title: "No se pudo cargar stock de campo",
                message,
              })
            }
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
        render: (diff) => {
          const value = normalizeNumber(diff);

          const isPositive = value > 0;
          const isNegative = value < 0;

          if (Number.isNaN(value)) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                -
              </span>
            );
          }

          if (!isPositive && !isNegative) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                0
              </span>
            );
          }

          if (isPositive) {
            return (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border"
                style={{
                  color: "var(--color-success)",
                  backgroundColor: "var(--color-success-light)",
                  borderColor: "rgba(16, 185, 129, 0.35)",
                }}
              >
                <Check className="w-3.5 h-3.5" />
                +{formatNumberAr(Math.abs(value))}
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
          const datePart = String(dateString).split("T")[0];
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
        render: (value) => <span className="font-bold text-gray-900">u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}</span>,
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
            <span className="font-bold text-gray-900">
              {isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}
            </span>
          );
        },
      },
    ],
    [projectId, stock, columnsFilters, refreshStock, handleViewConsumingOrders]
  );

  const selectColumn = useMemo<Column<SelectableStockItem>>(
    () =>
      makeSelectColumn<SelectableStockItem>(
        bulk,
        (item) => item.supply_name,
        SUPPLY_ENTITY,
      ),
    [bulk],
  );

  const columnsWithSelection = useMemo<Column<SelectableStockItem>[]>(
    () => [
      selectColumn,
      ...(columns as Column<SelectableStockItem>[]),
    ],
    [columns, selectColumn],
  );

  useEffect(() => {
    if (!projectId || !selectedCustomer || !selectedCampaignId) {
      return;
    }

    pagination.resetPage();
    setPeriod("0");
    setStockPeriods([{ id: 0, name: "Activo" }]);

    getStock(projectId, "");
    getPeriods(projectId);
    setDisabledCloseStock(false);
    setSelectedDate("");
  }, [getStock, getPeriods, projectId, selectedCustomer, selectedCampaignId]);

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

    pagination.resetPage();

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
  }, [period, stockPeriods, getStock, projectId]);

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
  }, [resultCloseStock, projectId, getStock, getPeriods]);

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
    if (!projectId) {
      setExportErrorMessage("Seleccione un proyecto antes de exportar stock.");
      return;
    }

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

  const handleFilterChange = (filters: Record<string, unknown>) => {
    setColumnsFilters(filters);
    pagination.resetPage();
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            accept:
              ".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
            onFileChange: handleImportFileChange,
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => handleExport(),
          },
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            href: "/admin/products/archived",
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => {
              if (!projectId) {
                setActionErrorMessage("Seleccione un proyecto antes de crear un movimiento de stock.");
                return;
              }
              if (disabledCloseStock) {
                setActionErrorMessage("No se puede crear un movimiento sobre un cierre de stock.");
                return;
              }
              setDrawerOpen(true);
            },
          },
        ]}
      />
      <SuccessBanner message={successMessage} variant="outlined" />
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
        <LoadingOverlay show={processing} />

        <ErrorBanner
          message={actionErrorMessage || exportErrorMessage || error}
          variant="outlined"
          prefix="Error:"
        />
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
        <WarningBanner message={errorPeriods} className="mb-3" />
        {projectId && customers && (
          <CreateStockItem
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            projectId={projectId}
            onStockCreated={handleStockCreated}
          />
        )}
        {projectId && importDrawerOpen && (
          <ImportSupplyMovements
            open={importDrawerOpen}
            file={pendingImportFile}
            projectId={projectId}
            onClose={() => {
              setImportDrawerOpen(false);
              setPendingImportFile(null);
            }}
            onImported={handleStockImported}
          />
        )}
        {projectId && selectedCustomer && selectedCampaignId && (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={selectableStock.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulkActions}
              entity={SUPPLY_ENTITY}
            />
            <DataTable
              data={selectableStock}
              columns={columnsWithSelection}
              message="No hay stock disponible"
              filters={columnsFilters}
              onFilterChange={handleFilterChange}
              enableFilters={true}
              pagination={pagination.buildPagination(selectableStock.length)}
            />
          </>
        )}
        <BaseModal
  isOpen={stockValidationModal !== null}
  onClose={() => setStockValidationModal(null)}
  title={stockValidationModal?.title ?? ""}
  message={stockValidationModal?.message ?? ""}
  primaryButtonText="Cerrar"
  secondaryButtonText={null}
  primaryButtonColor="bg-blue-600 hover:bg-blue-800 focus:ring-blue-300"
  onPrimaryAction={() => setStockValidationModal(null)}
/>
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
