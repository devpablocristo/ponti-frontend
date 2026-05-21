import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Check, AlertCircle, Briefcase, Plus, Upload } from "lucide-react";

import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";

import { DataTable, usePagination } from "@/lib/dataDisplay";
import { useNavigate } from "react-router-dom";
import useStock from "../../../hooks/useStock";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { Notification } from "../../../components/feedback/Notification";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { GetStockItems } from "../../../hooks/useStock/types";
import { Summary } from "@/api/types";
import { BaseModal } from "../../../components/Modal/BaseModal";
import { Column } from "../types";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeNumber } from "../utils";
import CreateStockItem from "./CreateStockItem";
import { getUnitName } from "../../../constants/units";
import { buildTimestampedFilename, downloadBlob } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";

const MULTIPLE_INVESTORS_LABEL = "+1 INV.";
const MISSING_ENTRY_LABEL = "REV ING.";

function getStockFilterValue(item: GetStockItems, key: keyof GetStockItems) {
  const value = item[key];

  if (key === "investor_name" && String(value ?? "").trim() === "") {
    return item.has_multiple_investors
      ? MULTIPLE_INVESTORS_LABEL
      : MISSING_ENTRY_LABEL;
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      onValidationError("Seleccioná un proyecto antes de guardar stock de campo.");
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
      onValidationError(errorStock);
      return;
    }
    if (resultStock) {
      setDrawerOpen(false);
      onSaved?.();
      return;
    }
  }, [errorStock, resultStock, onSaved, onValidationError]);

  return (
    <>
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
          className="app-action-button-icon"
          style={{ minWidth: 24, minHeight: 24 }}
          onClick={() => setDrawerOpen(true)}
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <EntityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Editar stock de campo"
        subtitle={item.supply_name}
        submitLabel="Guardar"
        processing={processingStock}
        onSubmit={save}
      >
        <InputField
          label="Stock de campo"
          name={`real-stock-${item.id}`}
          type="number"
          placeholder="Stock de campo"
          value={editValue}
          disabled={processingStock}
          onChange={(e) => setEditValue(e.target.value)}
        />
      </EntityFormDrawer>
    </>
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
    <div>
      <label className="block mb-1.5 text-xs font-medium text-slate-600">
        Cerrar stock a fecha
      </label>
      <div className="flex items-center gap-3">
        <input
          type="date"
          disabled={disabledCloseStock}
          value={internalDate}
          onChange={(e) => setInternalDate(e.target.value)}
          className="input-base appearance-none focus:ring-0 block text-sm py-2 px-3.5 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <label
          className={`inline-flex items-center gap-2 cursor-pointer ${
            disabledCloseStock ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
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
          <span className="text-xs font-medium text-slate-600">Cerrar stock</span>
        </label>
      </div>
    </div>
  );
}

function StockIndicators({ summary }: { summary: Summary }) {
  return (
    <div>
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
  const navigate = useNavigate();
  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const { projectId, filters, selectedCustomer, selectedCampaignId, selectedField, customers, hasWorkspaceSelection } =
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

  const stockQuery = useMemo(
    () =>
      buildWorkspaceQuery({
        customerId: selectedCustomer?.id,
        projectId,
        campaignId: selectedCampaignId,
        fieldId: selectedField?.id,
      }),
    [projectId, selectedCampaignId, selectedCustomer?.id, selectedField?.id]
  );

  const refreshStock = useCallback(() => {
    if (!hasWorkspaceSelection) return;

    getStock(
      stockQuery,
      period === "0" ? "" : stockPeriods[Number(period)]?.name || ""
    );
  }, [getStock, hasWorkspaceSelection, period, stockPeriods, stockQuery]);

  const handleStockCreated = () => {
    if (!projectId) return;
    resetPage();
    refreshStock();
  };

  const handleViewConsumingOrders = useCallback(
    (item: GetStockItems) => {
      if (!item.supply_id) return;

      const params = new URLSearchParams(stockQuery);
      params.set("supply_id", String(item.supply_id));
      params.set("supply_name", item.supply_name);
      navigate(`/admin/work-orders?${params.toString()}`);
    },
    [navigate, stockQuery]
  );

  const stockRows = useMemo(
    () => (hasWorkspaceSelection && Array.isArray(stock) ? stock : []),
    [hasWorkspaceSelection, stock]
  );

  const filteredStock = useMemo(() => {
    return stockRows.filter((item) => {
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
  }, [stockRows, columnsFilters]);

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
    const source = Array.isArray(stock) ? stock : [];
    const otherFilters = { ...filters };
    delete otherFilters[key];

    const filtered = source.filter((item) =>
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
          stockRows,
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
          stockRows,
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
          stockRows,
          columnsFilters
        ),
        render: (value, item) => {
          const investorName = String(value ?? "").trim();

          if (!investorName) {
            return (
              <span className="font-semibold text-red-600">
                {item.has_multiple_investors
                  ? MULTIPLE_INVESTORS_LABEL
                  : MISSING_ENTRY_LABEL}
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
          stockRows,
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
          stockRows,
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
          stockRows,
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
            onSaved={() => {
              setActionErrorMessage(null);
              setSuccessMessage("Stock de campo actualizado con éxito.");
              refreshStock();
            }}
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
          stockRows,
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
          stockRows,
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
    [projectId, stockRows, columnsFilters, refreshStock, handleViewConsumingOrders]
  );

  useEffect(() => {
    resetPage();
    setPeriod("0");
    setStockPeriods([{ id: 0, name: "Activo" }]);
    setDisabledCloseStock(!projectId);
    setSelectedDate("");

    if (!hasWorkspaceSelection) return;

    getStock(stockQuery, "");
    if (projectId) {
      getPeriods(projectId);
    }
  }, [getStock, getPeriods, hasWorkspaceSelection, projectId, resetPage, stockQuery]);

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
    resetPage();
    if (!hasWorkspaceSelection) return;

    const periodNumber = Number(period);
    if (periodNumber === 0) {
      getStock(stockQuery, "");
      setDisabledCloseStock(!projectId);
      setSelectedDate("");
      return;
    }

    getStock(stockQuery, stockPeriods[periodNumber]?.name || "");
    setSelectedDate(stockPeriods[periodNumber]?.name || "");
    setDisabledCloseStock(true);
  }, [period, stockPeriods, getStock, hasWorkspaceSelection, projectId, resetPage, stockQuery]);

  useEffect(() => {
    if (errorCloseStock) {
      setActionErrorMessage(errorCloseStock);
    }
  }, [errorCloseStock]);

  useEffect(() => {
    if (resultCloseStock && projectId) {
      setActionErrorMessage(null);
      setSuccessMessage(resultCloseStock);
      getStock(stockQuery, "");
      getPeriods(projectId);
      setEnabledCloseStock(false);
      setDisabledCloseStock(false);
      setSelectedDate("");
    }
  }, [resultCloseStock, projectId, getStock, getPeriods, stockQuery]);

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
      setWarningMessage("Para exportar stock, seleccioná un proyecto.");
      return;
    }

    try {
      setWarningMessage(null);
      setExportErrorMessage(null);
      const response = await apiClient.get<Blob>(
        `/stock/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("stock", "csv", projectId));
    } catch {
      setExportErrorMessage("No se pudo exportar el stock.");
    }
  };

  const handleFilterChange = (filters: Record<string, unknown>) => {
    setColumnsFilters(filters);
    resetPage();
  };

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => handleExport(),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: disabledCloseStock,
            onClick: () => {
              const warning = getGuardedWorkspaceActionWarning(
                { projectId },
                ["project"],
                "crear",
                "un ingreso de stock",
              );
              if (warning) {
                setWarningMessage(warning);
                return;
              }
              setWarningMessage(null);
              setDrawerOpen(true);
            },
          },
        ]}
      />
      <Notification variant="warning"
        message={warningMessage}
        onDismiss={() => setWarningMessage(null)}
      />
      {hasWorkspaceSelection && !error && (
        <div className="my-3">
          <StockIndicators summary={derivedSummary} />
        </div>
      )}
      <div className="mt-3 relative">
        <LoadingOverlay show={hasWorkspaceSelection && processing} />

        <Notification variant="success" message={successMessage} />
        <Notification variant="error"
          message={actionErrorMessage || exportErrorMessage || error}
          prefix="Error:"
        />
        {stockPeriods && stockPeriods.length > 0 && (
          <div className="mb-4 flex flex-wrap items-end gap-6">
            <SelectField
              label="Periodo (fecha de cierre)"
              name="period"
              options={stockPeriods}
              className="max-w-64"
              value={period}
              size="sm"
              onChange={(e) => setPeriod(e.target.value)}
            />
            <CloseStockDate
              date={selectedDate}
              onDateChange={handleDateChange}
              enabledCloseStock={enabledCloseStock}
              setEnabledCloseStock={setEnabledCloseStock}
              disabledCloseStock={disabledCloseStock || !projectId}
            />
          </div>
        )}
        {errorPeriods && (
          <div className="mb-3">
            <Notification variant="warning" message={errorPeriods} />
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
        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver stock"
            description="El listado no carga datos globales automáticamente."
          />
        ) : (
          <DataTable
            data={filteredStock}
            columns={columns}
            message="No hay stock disponible"
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters={true}
            pagination={pagination.buildPagination(filteredStock.length)}
          />
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
          primaryButtonText={"Sí, Cerrar"}
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
