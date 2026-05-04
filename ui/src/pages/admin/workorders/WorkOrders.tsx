import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { DataTable, usePagination } from "@devpablocristo/modules-ui-data-display";
import { Metrics, OrdersData, WorkorderData } from "../../../hooks/useWorkOrders/types";
import useOrders from "../../../hooks/useWorkOrders";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import CreateOrder from "./CreateOrder";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { BaseModal } from "../../../components/Modal/BaseModal";
import Button from "../../../components/Button/Button";
import UpdateOrder from "./UpdateOrder";
import { cropColors, laborColors } from "../../../pages/admin/colors";
import { Column } from "../../../pages/admin/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";
import { formatNumberAr, normalizeDate, formatISODate } from "../utils";

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

function OrdersHeader({
  ordersAmount,
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  allColumns,
}: {
  ordersAmount: number;
  selectedColumns: Array<keyof OrdersData>;
  setSelectedColumns: (columns: Array<keyof OrdersData>) => void;
  setVisibleColumns: (columns: Array<keyof OrdersData>) => void;
  allColumns: Column<OrdersData>[];
}) {
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  return (
    <div className="flex justify-between items-center p-4 bg-white rounded-t-xl border-b border-gray-100">
      <div className="text-sm text-gray-900">
        <span className="font-semibold">Cantidad de Órdenes Ingresadas:</span> {formatNumberAr(ordersAmount)}
      </div>

      <Button
        variant="primary"
        size="sm"
        iconLeft={
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h2a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM17 4a1 1 0 011-1h2a1 1 0 011 1v16a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM10 10h4M10 14h4"
            />
          </svg>
        }
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
}: {
  metrics: Metrics;
  processing: boolean;
}) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
      {processing ? (
        <div className="flex items-center justify-center py-4">
          <LoaderCircle className="animate-spin w-5 h-5 text-custom-btn mr-2" />
          <span className="text-sm text-gray-500 font-medium">Cargando indicadores...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
  const [drawerUpdateOpen, setDrawerUpdateOpen] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] =
    useState<WorkorderData | null>(null);

  const {
    getOrders,
    deleteOrder,
    deleteDraftOrder,
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


  // Filtros activos por columna
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [filterDatasetOrders, setFilterDatasetOrders] = useState<OrdersData[]>([]);
  const [filterDatasetReady, setFilterDatasetReady] = useState(false);
  const [filterDatasetVersion, setFilterDatasetVersion] = useState(0);
  const globalFilterSourceOrders = useMemo(
    () => (filterDatasetReady ? filterDatasetOrders : []),
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

  const {
    projectId,
    selectedProject,
    selectedField,
    selectedCustomer,
    selectedCampaignId,
    filters,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const effectiveProjectId = projectId ?? selectedProject?.id ?? routeProjectId;
  const hasWorkOrderScope = Boolean(effectiveProjectId || selectedField);

  const [errorMessage, setErrorMessage] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleOpenOrder(order: OrdersData) {
    setSelectedOrderRow({
      id: order.id,
      isDigital: isDigitalOrder(order),
    });
    setDrawerUpdateOpen(true);
  }

  const workOrdersBaseQuery = useMemo(() => {
    const params: Record<string, string> = {};

    if (selectedCustomer && selectedCustomer.id !== 0) {
      params.customer_id = String(selectedCustomer.id);
    }

    if (effectiveProjectId) {
      params.project_id = String(effectiveProjectId);
    }

    if (selectedCampaignId) {
      params.campaign_id = String(selectedCampaignId);
    }

    if (selectedField && selectedField.id !== 0) {
      params.field_id = String(selectedField.id);
    }

    if (selectedSupplyFilter.id) {
      params.supply_id = String(selectedSupplyFilter.id);
    }

    return new URLSearchParams(params).toString();
  }, [effectiveProjectId, selectedCampaignId, selectedCustomer, selectedField, selectedSupplyFilter.id]);

  const workOrdersQuery = useMemo(() => {
    const params = new URLSearchParams(workOrdersBaseQuery);
    params.set("page", String(pagination.page));
    params.set("per_page", String(pagination.perPage));
    return params.toString();
  }, [pagination.page, pagination.perPage, workOrdersBaseQuery]);

  const workOrdersFilterDatasetQuery = workOrdersBaseQuery;


  const handleOrderCreated = useCallback(() => {
    pagination.resetPage();
    getOrders(workOrdersQuery);
    getMetrics(workOrdersQuery);
    setFilterDatasetVersion((version) => version + 1);
  }, [getOrders, getMetrics, workOrdersQuery]);


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
      primaryButtonText: "Sí, publicar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => {
        void handlePublishOrder(order);
      },
    });
    setIsModalOpen(true);
  }

  async function handleDeleteDraft(order: OrdersData) {
    if (!isDigitalOrder(order) || order.status !== "draft") return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      await deleteDraftOrder(order.id);
      handleOrderCreated();
    } catch (error) {
      const status = extractErrorStatus(error);

      if (status === 404) {
        setErrorMessage("No se encontró el borrador digital.");
        return;
      }

      setErrorMessage(
        extractErrorMessage(error, "No se pudo eliminar la orden digital.")
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePreDeleteDraft(order: OrdersData) {
    setModalConfig({
      title: "Confirmar eliminación",
      message: `¿Está seguro que desea eliminar la orden ${order.number}?`,
      primaryButtonText: "Sí, eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => {
        void handleDeleteDraft(order);
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
    pagination.resetPage();
  }, [effectiveProjectId, selectedField, selectedCampaignId, selectedCustomer?.id, selectedSupplyFilter.id]);

  useEffect(() => {
    if (!hasWorkOrderScope) {
      setErrorMessage("Seleccione un proyecto o un campo para ver las ordenes");
      return;
    }

    setErrorMessage("");
    getOrders(workOrdersQuery);
    getMetrics(workOrdersQuery);
  }, [
    hasWorkOrderScope,
    workOrdersQuery,
    getOrders,
    getMetrics,
  ]);

  useEffect(() => {
    if (!hasWorkOrderScope) {
      setFilterDatasetOrders([]);
      setFilterDatasetReady(false);
      return;
    }

    let active = true;
    setFilterDatasetOrders([]);
    setFilterDatasetReady(false);

    if (!workOrdersFilterDatasetQuery) {
      setErrorMessage("Seleccione un proyecto o un campo para cargar filtros");
      return;
    }

    const querySuffix = `?${workOrdersFilterDatasetQuery}`;

    apiClient.get<WorkOrdersListResponse>(`/work-orders/filter-rows${querySuffix}`)
      .then((response) => {
        if (!active) return;
        setFilterDatasetOrders(response.data.rows ?? []);
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
    hasWorkOrderScope,
    workOrdersFilterDatasetQuery,
    filterDatasetVersion,
  ]);

  const handleOrderDuplicated = (order: WorkorderData) => {
    setSelectedOrderRow(null);
    setDrawerUpdateOpen(false);
    setDrawerOpen(true);
    setOrderToDuplicate(order);
  };

  const handlePreFinish = (id: number) => {
    setModalConfig({
      title: "Confirmar eliminación",
      message: "¿Está seguro que desea eliminar la orden?",
      primaryButtonText: "Sí, eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => handleFinishConfirmed(id),
    });
    setIsModalOpen(true);
  };

  const handleFinishConfirmed = async (id: number) => {
    setIsProcessing(true);

    try {
      await deleteOrder(id);
      setModalConfig({
        title: "Confirmación",
        message: "La orden ha sido eliminada.",
        primaryButtonText: "Volver",
        secondaryButtonText: "Volver",
        onConfirm: () => {
          navigate("/admin/work-orders");
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al eliminar la orden.";
      setErrorMessage(message);
      setModalConfig({
        title: "Error",
        message,
        primaryButtonText: "Volver",
        secondaryButtonText: "Volver",
        onConfirm: () => {
          setIsModalOpen(false);
        },
      });
    } finally {
      setIsModalOpen(true);
      setIsProcessing(false);
    }
  };

  const filteredOrders = useMemo(() => {
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
  }, [globalFilterSourceOrders, columnsFilters]);

  const derivedMetrics: Metrics = useMemo(() => {
    const toNum = (v: unknown) => Number(v) || 0;
    let surface_ha = 0, liters = 0, kilograms = 0, direct_cost = 0;
    const orderBaseNumbers = new Set<string>();

    filteredOrders.forEach((order) => {
      const baseNumber = getOrderBaseNumber(order.number);
      if (baseNumber) orderBaseNumbers.add(baseNumber);

      surface_ha += toNum(order.surface_ha);

      const consumption = String(order.consumption || "").trim();
      const match = consumption.match(/[\d.]+/);
      const amount = match ? parseFloat(match[0]) || 0 : 0;
      const unit = classifyConsumptionUnit(order);
      if (unit === "liter") liters += amount;
      else if (unit === "kilo") kilograms += amount;

      direct_cost += toNum(order.total_cost);
    });

    return { surface_ha, liters, kilograms, direct_cost, orders_count: orderBaseNumbers.size };
  }, [filteredOrders]);

  const hasColumnFilters = useMemo(
    () => Object.values(columnsFilters).some((v) => Array.isArray(v) ? v.length > 0 : !!v),
    [columnsFilters]
  );

  const displayedMetrics = hasColumnFilters ? derivedMetrics : metrics;

  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await apiClient.get<Blob>(
        `/work-orders/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = url;
      link.download = `ordenes_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("No se pudo exportar el listado de órdenes.");
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
            label: "Exportar Órdenes",
            icon: <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "+ Nueva Orden",
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => {
              setDrawerOpen(true);
              setOrderToDuplicate(null);
            },
          },
        ]}
      />
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200" role="alert">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
          <div><span className="font-semibold">Error:</span> {errorMessage}</div>
        </div>
      )}
      {!processing && !errorMetrics && orders.length > 0 && (
        <div className="my-4">
          <OrdersIndicators
            metrics={displayedMetrics}
            processing={processingMetrics}
          />
        </div>
      )}
      <div className="mt-4 relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        )}
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
        <DataTable
          key={`${projectId}-${selectedField?.id || 0}-${selectedSupplyFilter.id || 0}`}
          data={hasColumnFilters ? filteredOrders : orders}
          rowStyle="softZebra"
          filters={columnsFilters}
          onFilterChange={handleFilterChange}
          columns={columnsToShow}
          actionsHeader="Acciones"
          renderActions={(item) => {
            const isDraftDigital = isDigitalOrder(item) && item.status === "draft";

            if (isDigitalOrder(item) && !isDraftDigital) {
              return null;
            }

            if (!isDraftDigital) {
              return (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    handlePreFinish(item.id);
                  }}
                >
                  Eliminar
                </Button>
              );
            }

            return (
              <>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    handlePrePublish(item);
                  }}
                >
                  Publicar
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    handlePreDeleteDraft(item);
                  }}
                >
                  Eliminar
                </Button>
              </>
            );
          }}
          enableFilters={true}
          headerComponent={
            <OrdersHeader
              ordersAmount={Number(displayedMetrics.orders_count) || 0}
              selectedColumns={selectedColumns}
              setSelectedColumns={setSelectedColumns}
              setVisibleColumns={setVisibleColumns}
              allColumns={allColumns}
            />
          }
          message="No hay ordenes disponibles"
          pagination={pagination.buildPagination(
            hasColumnFilters ? filteredOrders.length : pageInfo?.total ?? filteredOrders.length,
            { serverSide: !hasColumnFilters }
          )}
        />
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
