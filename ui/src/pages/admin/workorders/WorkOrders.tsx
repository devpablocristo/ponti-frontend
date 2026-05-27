import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../components/feedback/Skeleton";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { Notification } from "../../../components/feedback/Notification";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../components/crud/ResponsiveTable";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { Metrics, OrdersData, WorkorderData } from "../../../hooks/useWorkOrders/types";
import useOrders from "../../../hooks/useWorkOrders";
import { useBulkActions } from "../../../hooks/useBulkActions";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
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
import { formatError } from "@/lib/format";
import { notify } from "@/lib/notify";
import { formatNumberAr, normalizeDate, formatISODate } from "../utils";
import { buildTimestampedFilename, downloadBlob, EXCEL_ACCEPT } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import { matchesSelectFilter } from "@/lib/tableFilters";
import ArchivedWorkOrders from "../master-data/work-orders/ArchivedWorkOrders";
import {
  parseAndResolveWorkOrdersCsv,
  WorkOrderPreviewRow,
} from "./importWorkOrders";
import ImportWorkOrdersPreview from "./ImportWorkOrdersPreview";
import { OrdersHeader } from "./_components/OrdersHeader";
import { OrdersIndicators } from "./_components/OrdersIndicators";
import {
  FILTER_HIERARCHY,
  classifyConsumptionUnit,
  countUniqueOrderBaseNumbers,
  getStatusBadgeClass,
  getStatusLabel,
  isDigitalOrder,
  isPendingSupplyPublishError,
  mapStatusFilterLabelToApi,
  translatePendingSupplyPublishError,
  type WorkOrdersListResponse,
} from "./helpers";

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

  // Drawer del preview/editor del import. El flujo: clic Importar → parseamos
  // el CSV y resolvemos nombres → abrimos este drawer con las filas detectadas
  // → el usuario revisa/destilda/edita → clic "Importar X filas" → POST.
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState<WorkOrderPreviewRow[]>([]);
  const [importGlobalErrors, setImportGlobalErrors] = useState<string[]>([]);
  const [, setImportLoading] = useState(false);

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

          if (Array.isArray(value)) {
            return matchesSelectFilter(orderValRaw, value);
          }

          return matchesSelectFilter(orderValRaw, [value]);
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
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)} <span className="text-gray-900 dark:text-gray-100 font-normal text-xs">Has</span></span>
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
        render: (value) => <span className="font-bold text-gray-900 dark:text-gray-100">{String(value)}</span>,
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
        render: (value) => <span className="font-bold text-gray-900 dark:text-gray-100">{String(value)}</span>
      },
      {
        key: "cost_per_ha",
        header: "Costo USD/Ha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("cost_per_ha"),
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900 dark:text-gray-100">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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
          return <span className="font-bold text-gray-900 dark:text-gray-100">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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
          return <span className="font-bold text-gray-900 dark:text-gray-100">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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

  // Convertimos el estado de mensaje en toast: cada vez que cambia y es
  // non-empty, dispara notify con la severidad correspondiente. Los setters
  // a "" no producen toast (es la forma de "limpiar" el slot).
  useEffect(() => {
    if (warningMessage) notify.warning(warningMessage);
  }, [warningMessage]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) notify.error(errorMessage);
  }, [errorMessage]);

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
            "Dirigirse a Datos Maestros > Administrar Insumos > Pendientes para completar la información faltante.",
          primaryButtonText: "Ir a Insumos",
          secondaryButtonText: "Cerrar",
          onConfirm: () => {
            navigate("/admin/master-data/supplies/list");
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
          formatError(error, {
            fallback: "No se pudieron cargar las opciones de filtros.",
          }),
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
        if (Array.isArray(value)) {
          return matchesSelectFilter(orderValRaw, value);
        }
        return matchesSelectFilter(orderValRaw, [value]);
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

  // El bulk opera sobre TODAS las filas del workspace (post filtros por columna),
  // no sobre la página visible. Así "Seleccionar todo" marca las 212 filas y no
  // solo las 10 paginadas. La tabla sigue mostrando solo la página actual; los
  // checkboxes por fila se renderizan a partir del set global de IDs seleccionados.
  const bulk = useBulkActions<OrdersData>({
    items: filteredOrders,
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

      downloadBlob(response, buildTimestampedFilename("ordenes", "csv", effectiveProjectId));
    } catch {
      setErrorMessage("No se pudo exportar el listado de órdenes.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!effectiveProjectId) {
      setWarningMessage("Para importar órdenes, seleccioná un proyecto.");
      return;
    }

    setErrorMessage("");
    setWarningMessage("");
    setSuccessMessage("");
    setImportLoading(true);

    try {
      const { rows, globalErrors } = await parseAndResolveWorkOrdersCsv({
        file,
        projectId: effectiveProjectId,
        defaultFieldId: selectedField?.id,
      });

      if (rows.length === 0 && globalErrors.length > 0) {
        setErrorMessage(globalErrors.join(" "));
        return;
      }

      // Abrimos el drawer aunque haya globalErrors: el usuario los ve arriba
      // y puede igual revisar las filas (algunos catálogos pueden estar OK).
      setImportRows(rows);
      setImportGlobalErrors(globalErrors);
      setImportDrawerOpen(true);
    } catch (error) {
      setErrorMessage(
        formatError(error, { fallback: "No se pudo procesar el Excel. Verificá que el archivo tenga el formato correcto." }),
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCompleted = (result: {
    imported: number;
    errors: string[];
  }) => {
    setImportDrawerOpen(false);
    setImportRows([]);
    setImportGlobalErrors([]);

    if (result.imported > 0) {
      setSuccessMessage(
        result.errors.length
          ? `Se importaron ${result.imported} órdenes. Se omitieron ${result.errors.length} filas.`
          : `Se importaron ${result.imported} órdenes correctamente.`,
      );
      handleOrderCreated();
    }
    if (result.errors.length > 0) {
      setErrorMessage(result.errors.slice(0, 5).join(" "));
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
            accept: EXCEL_ACCEPT,
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
        <LoadingOverlay show={isProcessing && displayedOrders.length > 0} />
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
          <ArchivedWorkOrders onAfterRestore={handleOrderCreated} />
        </ArchivedDrawer>
        {effectiveProjectId ? (
          <ImportWorkOrdersPreview
            open={importDrawerOpen}
            onClose={() => {
              setImportDrawerOpen(false);
              setImportRows([]);
              setImportGlobalErrors([]);
            }}
            projectId={effectiveProjectId}
            rows={importRows}
            globalErrors={importGlobalErrors}
            onCompleted={handleImportCompleted}
          />
        ) : null}
        {selectedSupplyFilter.id && (
          <div className="mb-3">
            <Notification variant="info">
              <div className="flex items-center justify-between gap-3">
                <span>
                  Filtrando órdenes que consumen:{" "}
                  <strong>{selectedSupplyFilter.name || `Insumo ${selectedSupplyFilter.id}`}</strong>
                </span>
                <button
                  type="button"
                  className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                  onClick={() => navigate("/admin/work-orders")}
                >
                  Quitar filtro
                </button>
              </div>
            </Notification>
          </div>
        )}
        {!effectiveHasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver órdenes de trabajo."
            description="El listado no carga datos sin un workspace (cliente / proyecto / campaña / campo) seleccionado."
          />
        ) : isProcessing && displayedOrders.length === 0 ? (
          <TableSkeleton rows={10} columns={visibleColumnsWithSelection.length} />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={filteredOrders.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={WORKORDER_ENTITY}
            />
            <ResponsiveTable<OrdersData>
              key={`${projectId}-${selectedField?.id || 0}-${selectedSupplyFilter.id || 0}`}
              data={displayedOrders}
              rowStyle="softZebra"
              filters={columnsFilters}
              onFilterChange={handleFilterChange}
              columns={visibleColumnsWithSelection}
              actionsHeader="Acciones"
              rowKey={(o, i) => `${o.id ?? i}`}
              emptyMessage="Todavía no hay órdenes de trabajo con los filtros actuales."
              renderActions={(item: OrdersData) => {
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
              message="Todavía no hay órdenes de trabajo con los filtros actuales."
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
