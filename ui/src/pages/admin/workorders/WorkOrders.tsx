import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Archive, Briefcase, Download, Plus, SlidersHorizontal, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import { WarningBanner } from "../../../components/feedback/WarningBanner";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { DataTable, usePagination } from "@/lib/dataDisplay";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { Metrics, OrdersData, WorkorderData } from "../../../hooks/useWorkOrders/types";
import useOrders from "../../../hooks/useWorkOrders";
import { useBulkActions } from "../../../hooks/useBulkActions";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import CreateOrder from "./CreateOrder";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { BaseModal } from "../../../components/Modal/BaseModal";
import Button from "../../../components/Button/Button";
import UpdateOrder from "./UpdateOrder";
import { cropColors, laborColors } from "../../../pages/admin/colors";
import { Column } from "../../../pages/admin/types";
import { WORKORDER_ENTITY } from "../entities";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatNumberAr, normalizeDate, formatISODate } from "../utils";
import { buildTimestampedFilename, downloadBlob } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import {
  getValueByAliases,
  parseCsv,
  parseImportDate,
} from "../products/importUtils";
import ArchivedWorkOrders from "../database/work-orders/ArchivedWorkOrders";

const FILTER_HIERARCHY: Record<string, string[]> = {
  project_name: ["field_name", "lot_name"],
  field_name: ["lot_name"],
};

type WorkOrdersListResponse = {
  success: true;
  data: {
    rows?: OrdersData[];
  };
};

/** Clasifica la unidad de consumo de una orden (litros, kilos, o null si no se puede determinar). */
function classifyConsumptionUnit(order: OrdersData): "liter" | "kilo" | null {
  const consumption = String(order.consumption || "").trim().toUpperCase();
  const typeName = String(order.type_name || "").toUpperCase();
  const categoryName = String(order.category_name || "").toUpperCase();
  const supplyName = String(order.supply_name || "").toUpperCase();

  if (consumption.includes("L") || consumption.includes("LT")) return "liter";
  if (consumption.includes("KG") || consumption.includes("K")) return "kilo";

  if (typeName.includes("AGROQUÍMICO") || typeName.includes("AGROQUIMICO")) return "liter";
  if (typeName.includes("SEMILLA")) return "kilo";

  const LITER_CATEGORIES = ["HERBICIDA", "COADYUVANTE", "CURASEMILLA", "INSECTICIDA", "FUNGICIDA"];
  const KILO_CATEGORIES = ["SEMILLA", "FERTILIZANTE"];
  if (LITER_CATEGORIES.some((k) => categoryName.includes(k))) return "liter";
  if (KILO_CATEGORIES.some((k) => categoryName.includes(k))) return "kilo";

  const LITER_SUPPLIES = ["HERBICIDA", "ACEITE", "INSECTICIDA", "FUNGICIDA", "LITRO"];
  const KILO_SUPPLIES = ["SEMILLA", "FERTILIZANTE", "KILO"];
  if (LITER_SUPPLIES.some((k) => supplyName.includes(k))) return "liter";
  if (KILO_SUPPLIES.some((k) => supplyName.includes(k))) return "kilo";

  return null;
}

function getStatusLabel(status: string) {
  return status === "draft" ? "Abierta" : "Cerrada";
}

function isPendingSupplyPublishError(message: string) {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("insumo") ||
      normalized.includes("supply") ||
      normalized.includes("supplies")) &&
    (normalized.includes("pendiente") ||
      normalized.includes("pending") ||
      normalized.includes("incompleto") ||
      normalized.includes("complete"))
  );
}

function translatePendingSupplyPublishError(message: string) {
  const normalized = message.toLowerCase();
  const englishPrefix = "cannot publish work order draft with pending supplies:";

  if (normalized.startsWith(englishPrefix)) {
    const pendingSupplies = message.slice(englishPrefix.length).trim();

    return pendingSupplies
      ? `No se puede publicar la orden porque tiene insumos pendientes de completar: ${pendingSupplies}`
      : "No se puede publicar la orden porque tiene insumos pendientes de completar.";
  }

  return message;
}

function mapStatusFilterLabelToApi(value: string) {
  if (value === "Abierta") return "draft";
  if (value === "Cerrada") return "published";
  return value;
}

function getStatusBadgeClass(status: string) {
  return status === "draft"
    ? "bg-amber-100 text-amber-800 border border-amber-200"
    : "bg-emerald-100 text-emerald-800 border border-emerald-200";
}

function isDigitalByNumber(order: OrdersData) {
  return String(order.number).trim().toUpperCase().startsWith("D");
}

function isDigitalOrder(order: OrdersData) {
  return order.is_digital || isDigitalByNumber(order);
}

function getOrderBaseNumber(orderNumber: string | number) {
  return String(orderNumber).trim().split(".")[0];
}

function countUniqueOrderBaseNumbers(orders: OrdersData[]) {
  return new Set(
    orders
      .map((order) => getOrderBaseNumber(order.number))
      .filter(Boolean)
  ).size;
}

function OrdersHeader({
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  allColumns,
}: {
  selectedColumns: Array<keyof OrdersData>;
  setSelectedColumns: (columns: Array<keyof OrdersData>) => void;
  setVisibleColumns: (columns: Array<keyof OrdersData>) => void;
  allColumns: Column<OrdersData>[];
}) {
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  return (
    <div className="flex justify-end items-center p-4 bg-white rounded-t-xl border-b border-gray-100">
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
              className="flex items-center text-sm font-medium text-gray-700 gap-2"
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
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              {col.header}
            </label>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}

function OrdersIndicators({
  metrics,
  processing,
  ordersAmount,
}: {
  metrics: Metrics;
  processing: boolean;
  ordersAmount: number;
}) {
  return (
    <div>
      {processing ? (
        <InlineSpinner
          label="Cargando indicadores..."
          spinnerClassName="text-custom-btn"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <IndicatorCard
            title="Sup. ejecutada"
            value={formatNumberAr(metrics.surface_ha) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Consumo en litros"
            value={formatNumberAr(metrics.liters) + " Lt"}
            color="gray"
          />
          <IndicatorCard
            title="Consumo en kilos"
            value={formatNumberAr(metrics.kilograms) + " Kg"}
            color="gray"
          />
          <IndicatorCard
            title="Costos directos"
            value={"u$ " + formatNumberAr(metrics.direct_cost)}
            color="red"
          />
          <IndicatorCard
            title="Cantidad Total de Órdenes"
            value={formatNumberAr(ordersAmount)}
            color="blue"
          />
        </div>
      )}
    </div>
  );
}

export function WorkOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSupplyFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const supplyID = Number(params.get("supply_id"));

    return {
      id: Number.isFinite(supplyID) && supplyID > 0 ? supplyID : null,
      name: params.get("supply_name") || "",
    };
  }, [location.search]);
  const routeProjectId = useMemo(() => {
    const value = Number(new URLSearchParams(location.search).get("project_id"));
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [location.search]);
  const [selectedOrderRow, setSelectedOrderRow] = useState<{
    id: number;
    isDigital: boolean;
  } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [drawerUpdateOpen, setDrawerUpdateOpen] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] =
    useState<WorkorderData | null>(null);

  const {
    getOrders,
    archiveOrder,
    publishDraftOrder,
    getMetrics,
    metrics,
    processingMetrics,
    errorMetrics,
    orders,
    pageInfo,
    processing,
    error,
  } = useOrders();

  const safeOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );

  // Filtros activos por columna
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [filterDatasetOrders, setFilterDatasetOrders] = useState<OrdersData[]>([]);
  const [filterDatasetReady, setFilterDatasetReady] = useState(false);
  const [filterDatasetVersion, setFilterDatasetVersion] = useState(0);
  const globalFilterSourceOrders = useMemo(
    () => (filterDatasetReady && Array.isArray(filterDatasetOrders) ? filterDatasetOrders : []),
    [filterDatasetOrders, filterDatasetReady]
  );

  // Helper: filtra las órdenes según todos los filtros activos
  const filterOrders = useCallback(
    (data: OrdersData[], filters: Record<string, unknown>) => {
      return data.filter((order) => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || (Array.isArray(value) && value.length === 0)) return true;

          if (key === "date") {
            const orderDate = normalizeDate(String(order.date));
            if (Array.isArray(value)) {
              return value.some((v) => orderDate === normalizeDate(String(v)));
            }
            return orderDate === normalizeDate(String(value));
          }

          if (key === "status") {
            const normalizedStatus = mapStatusFilterLabelToApi(String(order.status));

            if (Array.isArray(value)) {
              return value.some(
                (v) => normalizedStatus === mapStatusFilterLabelToApi(String(v))
              );
            }

            return normalizedStatus === mapStatusFilterLabelToApi(String(value));
          }

          const orderValRaw = order[key as keyof OrdersData];
          const orderVal = String(orderValRaw ?? "").toLowerCase();

          if (Array.isArray(value)) {
            return value.some((v) => orderVal === String(v).toLowerCase());
          }

          return orderVal === String(value).toLowerCase();
        });
      });
    },
    []
  );

  // Helper: obtiene las opciones válidas para una columna
  const getFilterOptionsForColumn = useCallback(
    (
      key: keyof OrdersData,
      customSort?: (
        a: OrdersData[keyof OrdersData],
        b: OrdersData[keyof OrdersData]
      ) => number
    ) => {
      const filtersExceptCurrent = { ...columnsFilters };
      delete filtersExceptCurrent[key];
      const filtered = filterOrders(globalFilterSourceOrders, filtersExceptCurrent);
      const options = [...new Set(filtered.map((order) => order[key]))];
      if (customSort) {
        options.sort(customSort);
      } else {
        options.sort();
      }
      return options.map(String);
    },
    [columnsFilters, filterOrders, globalFilterSourceOrders]
  );

  const handleOpenOrder = useCallback((order: OrdersData) => {
    setSelectedOrderRow({
      id: order.id,
      isDigital: isDigitalOrder(order),
    });
    setDrawerUpdateOpen(true);
  }, []);

  const columns: Column<OrdersData>[] = React.useMemo(() => {
    return [
      {
        key: "number",
        header: "N°",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("number", (a, b) => Number(a) - Number(b)),
        render: (value, data) => (
          <strong className="text-blue-700">
            <a
              onClick={() => {
                handleOpenOrder(data);
              }}
            >
              {value as string}
            </a>
          </strong>
        ),
      },
      {
        key: "status",
        header: "Estado",
        filterable: true,
        filterType: "select",
        filterOptions: ["Abierta", "Cerrada"],
        render: (value, data) => {
          const shouldShowDigitalStatus = isDigitalOrder(data);

          if (!shouldShowDigitalStatus) {
            return <span className="text-slate-400 text-xs">-</span>;
          }

          const status = String(value);
          return (
            <span
              className={`px-2 py-1 text-[12px] rounded-md font-medium ${getStatusBadgeClass(status)}`}
            >
              {getStatusLabel(status)}
            </span>
          );
        },
      },
      {
        key: "project_name",
        header: "Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("project_name"),
      },
      {
        key: "field_name",
        header: "Campo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("field_name"),
      },
      {
        key: "lot_name",
        header: "Lote",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("lot_name"),
      },
      {
        key: "date",
        header: "Fecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("date")
          .map(formatISODate)
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort(),
        render: (dateString) => formatISODate(String(dateString)),
      },
      {
        key: "crop_name",
        header: "Cultivo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("crop_name"),
        render: (crop) => {
          const cropName = String(crop);
          return (
            <span
              className={`px-2 py-1 text-[14px] rounded-md ${cropColors[cropName] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
                }`}
            >
              {cropName}
            </span>
          );
        },
      },
      {
        key: "labor_category_name",
        header: "Labor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("labor_category_name"),
        render: (labor) => {
          const laborName = String(labor);
          return (
            <span
              className={`px-2 py-1 text-[14px] rounded-md ${laborColors[laborName] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
                }`}
            >
              {laborName}
            </span>
          );
        },
      },
      {
        key: "type_name",
        header: "Tipo/Clase",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("type_name"),
      },
      {
        key: "contractor",
        header: "Contratista",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("contractor"),
      },
      {
        key: "surface_ha",
        header: "Superficie",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("surface_ha"),
        render: (value) => (
          <span className="font-semibold text-gray-900">{formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)} <span className="text-gray-900 font-normal text-xs">Has</span></span>
        ),
      },
      {
        key: "supply_name",
        header: "Insumo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("supply_name"),
      },
      {
        key: "consumption",
        header: "Consumo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("consumption"),
        render: (value) => <span className="font-bold text-gray-900">{String(value)}</span>,
      },
      {
        key: "category_name",
        header: "Rubro",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("category_name"),
      },
      {
        key: "dose",
        header: "Dosis",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("dose"),
        render: (value) => <span className="font-bold text-gray-900">{String(value)}</span>
      },
      {
        key: "cost_per_ha",
        header: "Costo USD/Ha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("cost_per_ha"),
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
      {
        key: "unit_price",
        header: "Precio unidad",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("unit_price"),
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
      {
        key: "total_cost",
        header: "Total costo (USD)",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("total_cost"),
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
    ];
  }, [
    getFilterOptionsForColumn,
    handleOpenOrder,
  ]);

  const allColumns = useMemo(
    () =>
      Array.from(
        new Map<keyof OrdersData, Column<OrdersData>>(
          columns.map((col) => [col.key, col])
        ).values()
      ),
    [columns]
  );
  const allColumnKeys = useMemo(
    () => allColumns.map((col) => col.key),
    [allColumns]
  );
  const latestAllColumnKeysRef = useRef(allColumnKeys);

  useEffect(() => {
    latestAllColumnKeysRef.current = allColumnKeys;
  }, [allColumnKeys]);

  const [selectedColumns, setSelectedColumns] = useState<Array<keyof OrdersData>>(
    () => allColumnKeys
  );
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof OrdersData>>(
    () => allColumnKeys
  );
  const columnsToShow = useMemo(
    () => allColumns.filter((col) => visibleColumns.includes(col.key)),
    [allColumns, visibleColumns]
  );

  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;

  const {
    projectId,
    selectedProject,
    selectedField,
    selectedCustomer,
    selectedCampaignId,
    filters,
    hasWorkspaceSelection,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const effectiveProjectId = projectId ?? selectedProject?.id ?? routeProjectId;
  const effectiveHasWorkspaceSelection = hasWorkspaceSelection || Boolean(routeProjectId);

  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const workOrdersBaseQuery = useMemo(() => {
    return buildWorkspaceQuery({
      customerId: selectedCustomer?.id,
      projectId: effectiveProjectId,
      campaignId: selectedCampaignId,
      fieldId: selectedField?.id,
      extra: { supply_id: selectedSupplyFilter.id },
    });
  }, [effectiveProjectId, selectedCampaignId, selectedCustomer, selectedField, selectedSupplyFilter.id]);

  const workOrdersQuery = useMemo(() => {
    const params = new URLSearchParams(workOrdersBaseQuery);
    params.set("page", String(pagination.page));
    params.set("per_page", String(pagination.perPage));
    return params.toString();
  }, [pagination.page, pagination.perPage, workOrdersBaseQuery]);

  const workOrdersFilterDatasetQuery = workOrdersBaseQuery;


  const handleOrderCreated = useCallback(() => {
    if (!effectiveHasWorkspaceSelection) return;

    resetPage();
    getOrders(workOrdersQuery);
    getMetrics(workOrdersQuery);
    setFilterDatasetVersion((version) => version + 1);
  }, [effectiveHasWorkspaceSelection, getOrders, getMetrics, resetPage, workOrdersQuery]);


  async function handlePublishOrder(order: OrdersData) {
    if (!isDigitalOrder(order) || order.status !== "draft") return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      await publishDraftOrder(order.id);
      handleOrderCreated();
    } catch (error) {
      const status = extractErrorStatus(error);
      const rawMessage = extractErrorMessage(
        error,
        "No se pudo publicar la orden digital."
      );
      const message = translatePendingSupplyPublishError(rawMessage);

      if (isPendingSupplyPublishError(message)) {
        setErrorMessage(message);
        setModalConfig({
          title: "Insumos pendientes",
          message:
            `${message}\n\n` +
            "Dirigirse a Base de Datos > Insumos > Pendientes para completar la información faltante.",
          primaryButtonText: "Ir a Insumos",
          secondaryButtonText: "Cerrar",
          onConfirm: () => {
            navigate("/admin/database/items/list");
          },
        });
        setIsModalOpen(true);
        return;
      }

      if (status === 409) {
        setErrorMessage(message);
        setModalConfig({
          title: "No se pudo publicar",
          message,
          primaryButtonText: "Cerrar",
          secondaryButtonText: "Cerrar",
          onConfirm: () => {
            setIsModalOpen(false);
          },
        });
        setIsModalOpen(true);
        return;
      }

      setErrorMessage(message);
      setModalConfig({
        title: "Error al publicar",
        message,
        primaryButtonText: "Cerrar",
        secondaryButtonText: "Cerrar",
        onConfirm: () => {
          setIsModalOpen(false);
        },
      });
      setIsModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePrePublish(order: OrdersData) {
    setModalConfig({
      title: "Confirmar publicación",
            message:
        `¿Está seguro que desea publicar la orden ${order.number}?\n\n` +
        "Si la orden contiene insumos pendientes de completar, la publicación será bloqueada.",
      primaryButtonText: "Sí, Publicar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => {
        void handlePublishOrder(order);
      },
    });
    setIsModalOpen(true);
  }

  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    primaryButtonText: "",
    secondaryButtonText: "Cancelar",
    onConfirm: () => { },
  });

  useEffect(() => {
    if (!error) return;
    setErrorMessage(error);
  }, [error]);

  useEffect(() => {
    if (location.pathname === "/admin/work-orders") return;

    setDrawerOpen(false);
    setDrawerUpdateOpen(false);
    setSelectedOrderRow(null);
    setOrderToDuplicate(null);
    setIsModalOpen(false);
    setIsProcessing(false);
  }, [location.pathname]);

  useEffect(() => {
    Object.entries(FILTER_HIERARCHY).forEach(([parent, children]) => {
      if (!columnsFilters[parent]) return;

      const parentFilter = columnsFilters[parent];
      const validData = globalFilterSourceOrders.filter((o) => {
        const orderValue = String(o[parent as keyof OrdersData]).toLowerCase();
        if (Array.isArray(parentFilter)) {
          return parentFilter.some(
            (val) => String(val).toLowerCase() === orderValue
          );
        } else {
          return orderValue === String(parentFilter).toLowerCase();
        }
      });

      children.forEach((child) => {
        const validValues = new Set(
          validData.map((o) => String(o[child as keyof OrdersData] ?? ""))
        );

        const childFilter = columnsFilters[child];
        if (childFilter) {
          if (Array.isArray(childFilter)) {
            const validChildValues = childFilter.filter((val) =>
              validValues.has(val)
            );
            if (validChildValues.length !== childFilter.length) {
              setColumnsFilters((prev) => {
                const updated = { ...prev };
                if (validChildValues.length > 0) {
                  updated[child] = validChildValues;
                } else {
                  delete updated[child];
                }
                return updated;
              });
            }
          } else {
            if (!validValues.has(String(childFilter))) {
              setColumnsFilters((prev) => {
                const updated = { ...prev };
                delete updated[child];
                return updated;
              });
            }
          }
        }
      });
    });
  }, [columnsFilters, globalFilterSourceOrders]);



  useEffect(() => {
    setVisibleColumns(latestAllColumnKeysRef.current);
    setColumnsFilters({});
    setFilterDatasetOrders([]);
    setFilterDatasetReady(false);
    resetPage();
  }, [effectiveProjectId, selectedField, selectedCampaignId, selectedCustomer?.id, selectedSupplyFilter.id, resetPage]);

  useEffect(() => {
    setWarningMessage("");
    setErrorMessage("");
    if (!effectiveHasWorkspaceSelection) return;

    getOrders(workOrdersQuery);
    getMetrics(workOrdersQuery);
  }, [
    effectiveHasWorkspaceSelection,
    workOrdersQuery,
    getOrders,
    getMetrics,
  ]);

  useEffect(() => {
    let active = true;
    setFilterDatasetOrders([]);
    setFilterDatasetReady(false);

    if (!effectiveHasWorkspaceSelection) {
      return () => {
        active = false;
      };
    }

    const querySuffix = workOrdersFilterDatasetQuery
      ? `?${workOrdersFilterDatasetQuery}`
      : "";

    apiClient.get<WorkOrdersListResponse>(`/work-orders/filter-rows${querySuffix}`)
      .then((response) => {
        if (!active) return;
        setFilterDatasetOrders(Array.isArray(response.data?.rows) ? response.data.rows : []);
        setFilterDatasetReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setFilterDatasetOrders([]);
        setFilterDatasetReady(false);
        setErrorMessage(
          extractErrorMessage(
            error,
            "No se pudieron cargar las opciones globales de filtros."
          )
        );
      });

    return () => {
      active = false;
    };
  }, [
    effectiveHasWorkspaceSelection,
    workOrdersFilterDatasetQuery,
    filterDatasetVersion,
  ]);

  const handleOrderDuplicated = (order: WorkorderData) => {
    setSelectedOrderRow(null);
    setDrawerUpdateOpen(false);
    setDrawerOpen(true);
    setOrderToDuplicate(order);
  };

  const filteredOrders = useMemo(() => {
    if (!effectiveHasWorkspaceSelection) return [];

    return globalFilterSourceOrders.filter((order) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        if (key === "date") {
          const orderDate = normalizeDate(String(order.date));
          if (Array.isArray(value)) {
            return value.some((v) => orderDate === normalizeDate(String(v)));
          }
          return orderDate === normalizeDate(String(value));
        }

        if (key === "status") {
          const normalizedStatus = mapStatusFilterLabelToApi(String(order.status));
          if (Array.isArray(value)) {
            return value.some(
              (v) => normalizedStatus === mapStatusFilterLabelToApi(String(v))
            );
          }
          return normalizedStatus === mapStatusFilterLabelToApi(String(value));
        }

        const orderValRaw = order[key as keyof OrdersData];
        const orderVal = String(orderValRaw ?? "").toLowerCase();
        if (Array.isArray(value)) {
          return value.some((v) => orderVal === String(v).toLowerCase());
        }
        return orderVal === String(value).toLowerCase();
      });
    });
  }, [effectiveHasWorkspaceSelection, globalFilterSourceOrders, columnsFilters]);

  const derivedMetrics: Metrics = useMemo(() => {
    const toNum = (v: unknown) => Number(v) || 0;
    let surface_ha = 0, liters = 0, kilograms = 0, direct_cost = 0;

    filteredOrders.forEach((order) => {
      surface_ha += toNum(order.surface_ha);

      const consumption = String(order.consumption || "").trim();
      const match = consumption.match(/[\d.]+/);
      const amount = match ? parseFloat(match[0]) || 0 : 0;
      const unit = classifyConsumptionUnit(order);
      if (unit === "liter") liters += amount;
      else if (unit === "kilo") kilograms += amount;

      direct_cost += toNum(order.total_cost);
    });

    return {
      surface_ha,
      liters,
      kilograms,
      direct_cost,
      orders_count: countUniqueOrderBaseNumbers(filteredOrders),
    };
  }, [filteredOrders]);

  const hasColumnFilters = useMemo(
    () => Object.values(columnsFilters).some((v) => Array.isArray(v) ? v.length > 0 : !!v),
    [columnsFilters]
  );

  const emptyMetrics: Metrics = {
    surface_ha: 0,
    liters: 0,
    kilograms: 0,
    direct_cost: 0,
    orders_count: 0,
  };
  const displayedMetrics = !effectiveHasWorkspaceSelection
    ? emptyMetrics
    : hasColumnFilters
      ? derivedMetrics
      : metrics;
  const displayedOrders = !effectiveHasWorkspaceSelection
    ? []
    : hasColumnFilters
      ? filteredOrders
      : safeOrders;
  const displayedRowsTotal = !effectiveHasWorkspaceSelection
    ? 0
    : hasColumnFilters
    ? filteredOrders.length
    : pageInfo?.total ?? safeOrders.length;
  const displayedOrdersCount = !effectiveHasWorkspaceSelection
    ? 0
    : hasColumnFilters
    ? derivedMetrics.orders_count
    : Number(metrics.orders_count) ||
      countUniqueOrderBaseNumbers(
        filterDatasetReady && filterDatasetOrders.length > 0
          ? filterDatasetOrders
          : safeOrders
      );

  const bulk = useBulkActions<OrdersData>({
    items: displayedOrders,
    entity: WORKORDER_ENTITY,
    archive: archiveOrder,
    onEdit: handleOpenOrder,
    onAfter: handleOrderCreated,
  });

  const selectColumn = useMemo<Column<OrdersData>>(
    () => makeSelectColumn<OrdersData>(bulk, (order) => order.number, WORKORDER_ENTITY),
    [bulk],
  );

  const visibleColumnsWithSelection = useMemo(
    () => [selectColumn, ...columnsToShow],
    [columnsToShow, selectColumn],
  );

  const handleExport = async () => {
    if (!effectiveProjectId) {
      setWarningMessage("Para exportar órdenes, seleccioná un proyecto.");
      return;
    }

    try {
      setWarningMessage("");
      const response = await apiClient.get<Blob>(
        `/work-orders/export/${effectiveProjectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("ordenes", "xlsx", effectiveProjectId));
    } catch {
      setErrorMessage("No se pudo exportar el listado de órdenes.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!effectiveProjectId) {
      setWarningMessage("Para importar órdenes, seleccioná un proyecto.");
      return;
    }

    try {
      setErrorMessage("");
      setWarningMessage("");
      setSuccessMessage("");

      const rows = parseCsv(await file.text());
      if (rows.length === 0) {
        setErrorMessage("El archivo no tiene órdenes válidas. Use CSV con encabezados.");
        return;
      }

      const errors: string[] = [];
      let imported = 0;

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        const number = getValueByAliases(row, ["numero", "nro", "n", "number"]);
        const fieldId = Number(
          getValueByAliases(row, ["campo_id", "field_id"]) || selectedField?.id || 0,
        );
        const lotId = Number(getValueByAliases(row, ["lote_id", "lot_id"]));
        const cropId = Number(getValueByAliases(row, ["cultivo_id", "crop_id"]));
        const laborId = Number(getValueByAliases(row, ["labor_id", "labor_id"]));
        const investorId = Number(getValueByAliases(row, ["inversor_id", "investor_id"]) || 0);
        const supplyId = Number(getValueByAliases(row, ["insumo_id", "supply_id"]) || 0);
        const effectiveArea = Number(
          getValueByAliases(row, ["superficie", "superficie_has", "effective_area"]) || 0,
        );
        const totalUsed = Number(
          getValueByAliases(row, ["consumo", "cantidad", "total_used"]) || 0,
        );
        const finalDose = Number(getValueByAliases(row, ["dosis", "dose", "final_dose"]) || 0);
        const date = parseImportDate(getValueByAliases(row, ["fecha", "date"]));

        if (!number) errors.push(`Fila ${rowNumber}: falta número.`);
        if (!date) errors.push(`Fila ${rowNumber}: fecha inválida.`);
        if (!fieldId) errors.push(`Fila ${rowNumber}: falta campo_id.`);
        if (!lotId) errors.push(`Fila ${rowNumber}: falta lote_id.`);
        if (!cropId) errors.push(`Fila ${rowNumber}: falta cultivo_id.`);
        if (!laborId) errors.push(`Fila ${rowNumber}: falta labor_id.`);
        if (!investorId) errors.push(`Fila ${rowNumber}: falta inversor_id.`);
        if (!effectiveArea) errors.push(`Fila ${rowNumber}: falta superficie.`);
        if (supplyId && (!totalUsed || !finalDose)) {
          errors.push(`Fila ${rowNumber}: insumo_id requiere consumo y dosis.`);
        }

        const rowHasErrors = errors.some((message) => message.startsWith(`Fila ${rowNumber}:`));
        if (rowHasErrors) continue;

        await apiClient.post("/work-orders", {
          number,
          project_id: effectiveProjectId,
          field_id: fieldId,
          lot_id: lotId,
          crop_id: cropId,
          labor_id: laborId,
          contractor: getValueByAliases(row, ["contratista", "contractor"]),
          observations: getValueByAliases(row, ["observaciones", "observations"]),
          date,
          investor_id: investorId,
          effective_area: effectiveArea,
          items: supplyId
            ? [
                {
                  supply_id: supplyId,
                  total_used: totalUsed,
                  final_dose: finalDose,
                },
              ]
            : [],
        });
        imported += 1;
      }

      if (imported > 0) {
        setSuccessMessage(
          errors.length
            ? `Se importaron ${imported} órdenes. Se omitieron ${errors.length} filas.`
            : `Se importaron ${imported} órdenes correctamente.`,
        );
        handleOrderCreated();
      }

      if (errors.length > 0) {
        setErrorMessage(errors.slice(0, 5).join(" "));
      }
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(error, "No se pudo importar órdenes. Use CSV válido."),
      );
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
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            accept: ".csv,text/csv",
            onFileChange: handleImport,
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
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => {
              const warning = getGuardedWorkspaceActionWarning(
                { projectId: effectiveProjectId },
                ["project"],
                "crear",
                "una orden",
              );
              if (warning) {
                setWarningMessage(warning);
                return;
              }
              setWarningMessage("");
              setDrawerOpen(true);
              setOrderToDuplicate(null);
            },
          },
        ]}
      />
      <WarningBanner message={warningMessage || null} />
      <SuccessBanner message={successMessage || null} variant="outlined" />
      <ErrorBanner message={errorMessage} variant="outlined" prefix="Error:" />
      {effectiveHasWorkspaceSelection && !processing && !errorMetrics && displayedOrders.length > 0 && (
        <div className="my-3">
          <OrdersIndicators
            metrics={displayedMetrics}
            processing={processingMetrics}
            ordersAmount={displayedOrdersCount}
          />
        </div>
      )}
      <div className="mt-3 relative">
        <LoadingOverlay show={isProcessing} />
        {selectedProject && (
          <CreateOrder
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            projectId={projectId}
            orderToDuplicate={orderToDuplicate}
            selectedField={selectedField}
            onOrderCreated={handleOrderCreated}
          />
        )}
        {selectedOrderRow && (
          <UpdateOrder
            orderId={selectedOrderRow.id}
            isDigital={selectedOrderRow.isDigital}
            drawerOpen={drawerUpdateOpen}
            setDrawerOpen={setDrawerUpdateOpen}
            onOrderUpdated={handleOrderCreated}
            onOrderDuplicated={handleOrderDuplicated}
          />
        )}
        <ArchivedDrawer
          open={archivedDrawerOpen}
          title="Órdenes archivadas"
          onClose={() => setArchivedDrawerOpen(false)}
        >
          <ArchivedWorkOrders />
        </ArchivedDrawer>
        {selectedSupplyFilter.id && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
            <span>
              Filtrando órdenes que consumen: <strong>{selectedSupplyFilter.name || `Insumo ${selectedSupplyFilter.id}`}</strong>
            </span>
            <button
              type="button"
              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
              onClick={() => navigate("/admin/work-orders")}
            >
              Quitar filtro
            </button>
          </div>
        )}
        {!effectiveHasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver órdenes de trabajo"
            description="El listado no carga datos globales automáticamente."
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={displayedOrders.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={WORKORDER_ENTITY}
            />
            <DataTable
              key={`${projectId}-${selectedField?.id || 0}-${selectedSupplyFilter.id || 0}`}
              data={displayedOrders}
              rowStyle="softZebra"
              filters={columnsFilters}
              onFilterChange={handleFilterChange}
              columns={visibleColumnsWithSelection}
              actionsHeader="Acciones"
              renderActions={(item) => {
                const isDraftDigital = isDigitalOrder(item) && item.status === "draft";

                if (isDigitalOrder(item) && !isDraftDigital) {
                  return null;
                }

                if (!isDraftDigital) {
                  return null;
                }

                return (
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      handlePrePublish(item);
                    }}
                  >
                    Publicar
                  </Button>
                );
              }}
              enableFilters={true}
              headerComponent={
                <OrdersHeader
                  selectedColumns={selectedColumns}
                  setSelectedColumns={setSelectedColumns}
                  setVisibleColumns={setVisibleColumns}
                  allColumns={allColumns}
                />
              }
              message="No hay ordenes disponibles"
              pagination={pagination.buildPagination(
                displayedRowsTotal,
                { serverSide: !hasColumnFilters }
              )}
            />
          </>
        )}
        <BaseModal
          isOpen={isModalOpen}
          isSaving={isProcessing}
          onClose={() => setIsModalOpen(false)}
          title={modalConfig.title}
          message={modalConfig.message}
          primaryButtonText={modalConfig.primaryButtonText}
          secondaryButtonText={modalConfig.secondaryButtonText}
          onPrimaryAction={() => {
            modalConfig.onConfirm();
            setIsModalOpen(false);
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <p>{modalConfig.message}</p>
          </div>
        </BaseModal>
      </div>
    </div>
  );
}
