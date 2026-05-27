import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../components/feedback/Skeleton";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../hooks/useBulkActions";

import useLabors from "../../../hooks/useLabors";
import useWorkOrders from "../../../hooks/useWorkOrders";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../components/crud/ResponsiveTable";
import { InvoiceData, LaborGroupData, Metrics } from "../../../hooks/useLabors/types";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import { cropColors, laborColors } from "../../../pages/admin/colors";
import { Column } from "../../../pages/admin/types";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeDate } from "../utils";
import { WORKORDER_ENTITY } from "../entities";
import { buildTimestampedFilename, downloadBlob, EXCEL_ACCEPT } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import ArchivedWorkOrders from "../master-data/work-orders/ArchivedWorkOrders";
import CreateOrder from "../workorders/CreateOrder";
// El "Importar" de /admin/tasks NO importa el catálogo de labores
// (eso está en /admin/master-data/labors). Acá las filas son las labores
// aplicadas a Órdenes de Trabajo — mismo importer que /admin/work-orders,
// solo cambia que el CSV viene sin columnas de insumos (items vacío).
import {
  parseAndResolveWorkOrdersCsv,
  WorkOrderPreviewRow,
} from "../workorders/importWorkOrders";
import ImportWorkOrdersPreview from "../workorders/ImportWorkOrdersPreview";
import { formatError } from "@/lib/format";
import { notify } from "@/lib/notify";
import {
  matchesSelectFilter,
  matchesTextFilter,
} from "@/lib/tableFilters";

import { LaborsHeader } from "./_components/LaborsHeader";
import { TasksIndicators } from "./_components/TasksIndicators";
import {
  invoiceEmptyStatus,
  invoiceStatusOptions,
  statusConfig,
} from "./helpers";

export function Labors() {
  const {
    getLaborGroups,
    laborGroups,
    getMetrics,
    processing,
    error,
    errorMetrics,
    pageInfo,
    updateInvoice,
    createInvoice,
    processingInvoice,
    errorInvoice,
    resultInvoice,
  } = useLabors();
  const { archiveOrder } = useWorkOrders();

  // Errores del hook (data load, metrics, invoice) llegan al toaster.
  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (errorMetrics) notify.error(errorMetrics);
  }, [errorMetrics]);
  useEffect(() => {
    if (errorInvoice) notify.error(errorInvoice);
  }, [errorInvoice]);

  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;
  const [taskFilters, setTaskFilters] = useState<Record<string, unknown>>({});
  const [invoice, setInvoice] = useState<InvoiceData>({
    workorder_id: 0,
    investor_id: 0,
    invoice_id: 0,
    invoice_number: "",
    invoice_company: "",
    invoice_date: "",
    invoice_status: "",
  });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [resultInvoiceMessage, setResultInvoiceMessage] = useState<string | null>(null);
  const [errorInvoiceMessage, setErrorInvoiceMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Estado → toast (patrón documentado en CreateOrder.tsx).
  useEffect(() => {
    if (warningMessage) notify.warning(warningMessage);
  }, [warningMessage]);
  useEffect(() => {
    if (resultInvoiceMessage) notify.success(resultInvoiceMessage);
  }, [resultInvoiceMessage]);
  useEffect(() => {
    if (errorInvoiceMessage) notify.error(errorInvoiceMessage);
  }, [errorInvoiceMessage]);
  useEffect(() => {
    if (exportErrorMessage) notify.error(exportErrorMessage);
  }, [exportErrorMessage]);

  // Errores que vienen del hook se publican al toaster directamente.
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [createOrderDrawerOpen, setCreateOrderDrawerOpen] = useState(false);

  // Import de OT (no de catálogo). El CSV de /admin/tasks tiene labores
  // aplicadas a OTs — el mismo formato que el export de /admin/work-orders
  // pero sin columnas de insumos. Reusamos el drawer de preview de OT.
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState<WorkOrderPreviewRow[]>([]);
  const [importGlobalErrors, setImportGlobalErrors] = useState<string[]>([]);

  const {
    filters,
    projectId,
    selectedCustomer,
    selectedCampaignId,
    selectedField,
    hasWorkspaceSelection,
  } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);

  const laborQuery = useMemo(
    () =>
      buildWorkspaceQuery({
        customerId: selectedCustomer?.id,
        projectId,
        campaignId: selectedCampaignId,
        fieldId: selectedField?.id,
      }),
    [projectId, selectedCampaignId, selectedCustomer?.id, selectedField?.id]
  );

  useEffect(() => {
    if (resultInvoice) {
      setResultInvoiceMessage(resultInvoice);
      if (!hasWorkspaceSelection) return;
      getLaborGroups(laborQuery);
      getMetrics(laborQuery);
    }
  }, [resultInvoice, hasWorkspaceSelection, laborQuery, getLaborGroups, getMetrics]);

  useEffect(() => {
    if (errorInvoice) {
      setResultInvoiceMessage(null);
      setErrorInvoiceMessage(errorInvoice);
    }
  }, [errorInvoice]);

  const getFilterOptionsForColumn = useCallback(
    (key: keyof LaborGroupData, data: LaborGroupData[], filters: Record<string, unknown>) => {
      const otherFilters = { ...filters };
      delete otherFilters[key];

      const filtered = data.filter((task) =>
        Object.entries(otherFilters).every(([k, value]) => {
          if (!value || (Array.isArray(value) && value.length === 0)) return true;

          if (k === "date") {
            const normalize = (d: string) =>
              d.includes("/") ? d.split("/").reverse().join("-") : d.split("T")[0];
            if (Array.isArray(value)) {
              return value.some((v) => normalize(String(v)) === normalize(String(task.date)));
            }
            return normalize(String(value)) === normalize(String(task.date));
          }

          const taskValue = task[k as keyof LaborGroupData];

          if (Array.isArray(value)) {
            return matchesSelectFilter(taskValue, value);
          }

          return matchesTextFilter(taskValue, value);
        })
      );

      return [...new Set(filtered.map((t) => String(t[key] ?? "")))].filter(Boolean).sort();
    },
    []
  );

  const columns: Column<LaborGroupData>[] = useMemo(
    () => [
      {
        key: "workorder_number",
        header: "OT N°",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("workorder_number", laborGroups, taskFilters),
        render: (value) => <strong className="text-gray-900 dark:text-gray-100">{String(value ?? "")}</strong>,
      },
      {
        key: "date",
        header: "Fecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("date", laborGroups, taskFilters).map((d) => {
          const datePart = d.split("T")[0];
          const [y, m, day] = datePart.split("-");
          return `${day}/${m}/${y}`;
        }),
        render: (dateString) => {
          if (!dateString) return "";
          const datePart = String(dateString).split("T")[0];
          const [year, month, day] = datePart.split("-").map(Number);
          const dayStr = String(day).padStart(2, "0");
          const monthStr = String(month).padStart(2, "0");
          return `${dayStr}/${monthStr}/${year}`;
        },
      },
      {
        key: "field_name",
        header: "Campo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("field_name", laborGroups, taskFilters),
      },
      {
        key: "lot_name",
        header: "Lotes",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("lot_name", laborGroups, taskFilters),
      },

      {
        key: "crop_name",
        header: "Cultivo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("crop_name", laborGroups, taskFilters),
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
        key: "contractor",
        header: "Contratista",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("contractor", laborGroups, taskFilters),
      },
      {
        key: "category_name",
        header: "Labor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("category_name", laborGroups, taskFilters),
        render: (crop) => {
          const laborName = String(crop);
          return (
            <span
              className={`px-2 py-1 text-[14px] rounded-md ${laborColors[laborName] || "bg-green-200 text-green-800"
                }`}
            >
              {laborName}
            </span>
          );
        },
      },
      {
        key: "surface_ha",
        header: "Superficie",
        filterable: true,
        filterOptions: getFilterOptionsForColumn("surface_ha", laborGroups, taskFilters),
        render: (value) => (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
            <span className="text-gray-900 dark:text-gray-100 font-normal text-xs">Has</span>
          </span>
        ),
      },
      {
        key: "cost_ha",
        header: "Costo $/Ha",
        filterable: true,
        filterOptions: getFilterOptionsForColumn("cost_ha", laborGroups, taskFilters),
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            $ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "net_total",
        header: "Total $ Neto",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            $ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "total_iva",
        header: "Total $ IVA",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            $ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "investor_name",
        header: "Inversor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("investor_name", laborGroups, taskFilters),
      },
      {
        key: "usd_avg_value",
        header: "u$ Prom",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "usd_cost_ha",
        header: "Costo U$/Ha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("usd_cost_ha", laborGroups, taskFilters),
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "usd_net_total",
        header: "Total u$ Neto",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "invoice_number",
        header: "N° Factura",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("invoice_number", laborGroups, taskFilters),
        render: (value) => (
          <input
            type="text"
            className="block w-full min-w-[80px] py-1 px-2 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-sm disabled:opacity-50"
            value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
            disabled={true}
          />
        ),
      },
      {
        key: "invoice_company",
        header: "Empresa",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("invoice_company", laborGroups, taskFilters),
        render: (value) => (
          <input
            type="text"
            className="block w-full min-w-[80px] py-1 px-2 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-sm disabled:opacity-50"
            value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
            disabled={true}
          />
        ),
      },
      {
        key: "invoice_date",
        header: "Fecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("invoice_date", laborGroups, taskFilters),
        render: (dateString) => {
          const rawDate =
            typeof dateString === "string" || typeof dateString === "number"
              ? String(dateString)
              : "";
          if (!rawDate || rawDate === "0001-01-01T00:00:00Z" || rawDate.startsWith("0001-01-01")) {
            return (
              <input
                type="text"
                className="block w-full min-w-[80px] py-1 px-2 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-sm disabled:opacity-50"
                value=""
                disabled={true}
              />
            );
          }
          const datePart = rawDate.split("T")[0];
          const [year, month, day] = datePart.split("-").map(Number);
          const dayStr = String(day).padStart(2, "0");
          const monthStr = String(month).padStart(2, "0");
          return `${dayStr}/${monthStr}/${year}`;
        },
      },
      {
        key: "invoice_status",
        header: "Estado factura",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("invoice_status", laborGroups, taskFilters),
        render: (status) => {
          const normalizedStatus =
            typeof status === "string" && status ? status : invoiceEmptyStatus;

          const config = statusConfig[normalizedStatus] || {
            classes: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200",
            icon: null,
          };

          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-[14px] rounded-xl ${config.classes}`}
            >
              {config.icon}
              {normalizedStatus}
            </span>
          );
        },
      },
    ],
    [
      laborGroups,
      taskFilters,
      getFilterOptionsForColumn,
    ]
  );

  const allColumns = useMemo(() => {
    const map = new Map<keyof LaborGroupData, Column<LaborGroupData>>();
    [...columns].forEach((col) => {
      map.set(col.key, col);
    });
    return Array.from(map.values());
  }, [columns]);
  const allColumnKeys = useMemo(() => allColumns.map((col) => col.key), [allColumns]);
  const latestAllColumnKeysRef = useRef(allColumnKeys);

  useEffect(() => {
    latestAllColumnKeysRef.current = allColumnKeys;
  }, [allColumnKeys]);

  const [columnsToShow, setColumnsToShow] = useState(columns);
  const [selectedColumns, setSelectedColumns] = useState<Array<keyof LaborGroupData>>(
    () => allColumnKeys
  );
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof LaborGroupData>>(
    () => allColumnKeys
  );

  useEffect(() => {
    setVisibleColumns(latestAllColumnKeysRef.current);
    resetPage();

    if (!hasWorkspaceSelection) return;

    getLaborGroups(laborQuery);
    getMetrics(laborQuery);
  }, [hasWorkspaceSelection, laborQuery, getLaborGroups, getMetrics, resetPage]);

  const filteredTasks = useMemo(() => {
    if (!hasWorkspaceSelection) return [];

    return laborGroups.filter((task) => {
      return Object.entries(taskFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        if (key === "date") {
          const taskDate = normalizeDate(String(task.date));
          if (Array.isArray(value)) {
            return value.some((v) => normalizeDate(String(v)) === taskDate);
          }
          return normalizeDate(String(value)) === taskDate;
        }

        if (key === "invoice_status") {
          const taskStatus = task.invoice_status || invoiceEmptyStatus;
          if (Array.isArray(value)) return value.includes(taskStatus);
          return taskStatus === value;
        }
        const taskValue = task[key as keyof LaborGroupData];

        if (Array.isArray(value)) {
          return matchesSelectFilter(taskValue, value);
        }

        return matchesSelectFilter(taskValue, [value]);
      });
    });
  }, [hasWorkspaceSelection, laborGroups, taskFilters]);

  type SelectableLaborGroup = LaborGroupData & { id: number };

  const selectableTasks = useMemo<SelectableLaborGroup[]>(
    () =>
      filteredTasks.map((task) => ({
        ...task,
        id: task.workorder_id,
      })),
    [filteredTasks],
  );

  const openInvoiceEditor = useCallback((item: LaborGroupData) => {
    setResultInvoiceMessage(null);
    setErrorInvoiceMessage(null);

    if (item.invoice_id === 0) {
      setInvoice({
        workorder_id: item.workorder_id,
        investor_id: item.investor_id,
        invoice_id: 0,
        invoice_number: "",
        invoice_company: "",
        invoice_date: "",
        invoice_status: "",
      });
      setShowInvoiceModal(true);
      return;
    }

    const statusOption = invoiceStatusOptions.find(
      (opt) => opt.name === item.invoice_status
    );

    setInvoice({
      workorder_id: item.workorder_id,
      investor_id: item.investor_id,
      invoice_id: item.invoice_id,
      invoice_number: item.invoice_number,
      invoice_company: item.invoice_company,
      invoice_date: item.invoice_date ? (item.invoice_date ?? "").split("T")[0] : "",
      invoice_status: statusOption ? statusOption.id.toString() : "",
    });
    setShowInvoiceModal(true);
  }, []);

  const refreshLabors = useCallback(() => {
    if (!hasWorkspaceSelection) return;

    getLaborGroups(laborQuery);
    getMetrics(laborQuery);
  }, [getLaborGroups, getMetrics, hasWorkspaceSelection, laborQuery]);

  const bulk = useBulkActions<SelectableLaborGroup>({
    items: selectableTasks,
    entity: WORKORDER_ENTITY,
    archive: archiveOrder,
    onEdit: openInvoiceEditor,
    onAfter: refreshLabors,
  });

  const selectColumn = useMemo<Column<SelectableLaborGroup>>(
    () => makeSelectColumn<SelectableLaborGroup>(bulk, (task) => task.workorder_number, WORKORDER_ENTITY),
    [bulk],
  );

  const columnsWithSelection = useMemo<Column<SelectableLaborGroup>[]>(
    () => [
      selectColumn,
      ...(columnsToShow as Column<SelectableLaborGroup>[]),
    ],
    [columnsToShow, selectColumn],
  );

  const derivedMetrics: Metrics = useMemo(() => {
    if (!filteredTasks.length) {
      return {
        surface_ha: 0,
        avg_cost_per_ha: 0,
        net_total_cost: 0,
      };
    }

    const surface = filteredTasks.reduce((sum, t) => sum + Number(t.surface_ha || 0), 0);

    const totalCost = filteredTasks.reduce((sum, t) => sum + Number(t.net_total || 0), 0);

    const avgCost = surface > 0 ? totalCost / surface : 0;

    return {
      surface_ha: surface,
      avg_cost_per_ha: avgCost,
      net_total_cost: totalCost,
    };
  }, [filteredTasks]);

  useEffect(() => {
    setColumnsToShow(columns);
  }, [columns]);

  useEffect(() => {
    setColumnsToShow(allColumns.filter((col) => visibleColumns.includes(col.key)));
  }, [visibleColumns, allColumns]);

  const isValidDate = (dateString: string) => {
    if (!dateString) return false;
    if (/^(00|0000)[/-](00|00)[/-](0000|00)$/.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setWarningMessage("Para importar labores, seleccioná un proyecto.");
      return;
    }

    setWarningMessage(null);
    setExportErrorMessage(null);

    try {
      // El CSV de /admin/tasks es el mismo modelo que el de /admin/work-orders
      // (labores aplicadas a OTs) — solo sin columnas de insumos. Reusamos
      // el parser de OT: cada fila → una OT con items=[].
      const { rows, globalErrors } = await parseAndResolveWorkOrdersCsv({
        file,
        projectId,
        defaultFieldId: selectedField?.id,
      });

      if (rows.length === 0 && globalErrors.length > 0) {
        setExportErrorMessage(globalErrors.join(" "));
        return;
      }

      setImportRows(rows);
      setImportGlobalErrors(globalErrors);
      setImportDrawerOpen(true);
    } catch (error) {
      setExportErrorMessage(
        formatError(error, { fallback: "No se pudo procesar el Excel. Verificá que el archivo tenga el formato correcto." }),
      );
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
      setResultInvoiceMessage(
        result.errors.length
          ? `Se importaron ${result.imported} órdenes. Se omitieron ${result.errors.length} filas.`
          : `Se importaron ${result.imported} órdenes correctamente.`,
      );
      refreshLabors();
    }
    if (result.errors.length > 0) {
      setExportErrorMessage(result.errors.slice(0, 5).join(" "));
    }
  };

  const handleExport = async () => {
    if (!projectId) {
      setWarningMessage("Para exportar labores, seleccioná un proyecto.");
      return;
    }

    try {
      setWarningMessage(null);
      setExportErrorMessage(null);
      const response = await apiClient.get<Blob>(`/labors/export/${projectId}`, undefined, {
        responseType: "blob",
      });

      downloadBlob(response, buildTimestampedFilename("labores", "csv", projectId));
    } catch {
      setExportErrorMessage("No se pudo exportar el listado de labores.");
    }
  };

  // Handler para resetear página al aplicar filtros
  const handleFilterChange = (filters: Record<string, unknown>) => {
    setTaskFilters(filters);
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
                { projectId },
                ["project"],
                "crear",
                "una orden de trabajo",
              );
              if (warning) {
                setWarningMessage(warning);
                return;
              }
              setWarningMessage(null);
              setCreateOrderDrawerOpen(true);
            },
          },
        ]}
      />
      <CreateOrder
        drawerOpen={createOrderDrawerOpen}
        setDrawerOpen={setCreateOrderDrawerOpen}
        projectId={projectId}
        selectedField={selectedField}
        orderToDuplicate={null}
        onOrderCreated={refreshLabors}
      />
      {projectId ? (
        <ImportWorkOrdersPreview
          open={importDrawerOpen}
          onClose={() => {
            setImportDrawerOpen(false);
            setImportRows([]);
            setImportGlobalErrors([]);
          }}
          projectId={projectId}
          rows={importRows}
          globalErrors={importGlobalErrors}
          onCompleted={handleImportCompleted}
        />
      ) : null}
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Órdenes de trabajo archivadas (por labor)"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        {/* En esta página "Labores" se archivan work-orders (no entradas del catálogo
            de labors), por lo que el drawer muestra órdenes de trabajo archivadas. */}
        <ArchivedWorkOrders onAfterRestore={refreshLabors} />
      </ArchivedDrawer>
      {hasWorkspaceSelection && !errorMetrics && (
        <div className="my-3">
          <TasksIndicators
            metrics={derivedMetrics}
            processing={processing}
            laborsAmount={filteredTasks.length}
          />
        </div>
      )}

      <div className="mt-3 relative">
        <LoadingOverlay show={hasWorkspaceSelection && processing && selectableTasks.length > 0} />
        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver labores"
            description="El listado no carga datos globales automáticamente."
          />
        ) : processing && selectableTasks.length === 0 ? (
          <TableSkeleton rows={10} columns={columnsWithSelection.length} />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={selectableTasks.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={WORKORDER_ENTITY}
            />
            <ResponsiveTable<SelectableLaborGroup>
              key={laborGroups.length}
              data={selectableTasks}
              rowStyle="softZebra"
              columns={columnsWithSelection}
              filters={taskFilters}
              onFilterChange={handleFilterChange}
              className={`${processing ? "pointer-events-none opacity-60" : ""}`}
              enableFilters={true}
              message="Todavía no hay labores con los filtros actuales."
              headerComponent={
                <LaborsHeader
                  selectedColumns={selectedColumns}
                  setSelectedColumns={setSelectedColumns}
                  setVisibleColumns={setVisibleColumns}
                  allColumns={allColumns}
                />
              }
              pagination={
                pageInfo
                  ? pagination.buildPagination(filteredTasks.length)
                  : undefined
              }
              rowKey={(t, i) => `${t.id ?? i}`}
              emptyMessage="Todavía no hay labores con los filtros actuales."
            />
          </>
        )}
        <EntityFormDrawer
          open={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title="Cargar Factura"
          submitLabel="Cargar"
          processing={processingInvoice}
          errorMessage={errorInvoiceMessage}
          onDismissError={() => setErrorInvoiceMessage(null)}
          successMessage={resultInvoiceMessage}
          onDismissSuccess={() => setResultInvoiceMessage(null)}
          onSubmit={() => {
            if (processingInvoice) return;

            const statusText = invoiceStatusOptions.find(
              (opt) => opt.id.toString() === invoice.invoice_status
            )?.name;
            if (!statusText) return;

            setResultInvoiceMessage(null);
            setErrorInvoiceMessage(null);

            if (!isValidDate(invoice.invoice_date)) {
              setErrorInvoiceMessage("La fecha ingresada no es válida.");
              return;
            }

            const invoiceData = {
              ...invoice,
              invoice_status: statusText,
            };

            if (invoiceData.invoice_id > 0) {
              updateInvoice(invoiceData.invoice_id, invoiceData);
            } else {
              createInvoice(invoiceData);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Ingrese N° Factura"
              placeholder="N°"
              name="invoiceNumber"
              value={invoice.invoice_number}
              disabled={processingInvoice}
              onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
            />
            <InputField
              label="Fecha"
              type="date"
              placeholder="Fecha"
              name="invoiceDate"
              disabled={processingInvoice}
              value={invoice.invoice_date}
              onChange={(e) => setInvoice({ ...invoice, invoice_date: e.target.value })}
            />
            <InputField
              label="Ingrese Nombre Empresa"
              placeholder="Empresa"
              name="companyName"
              disabled={processingInvoice}
              value={invoice.invoice_company}
              onChange={(e) => setInvoice({ ...invoice, invoice_company: e.target.value })}
            />
            <SelectField
              label="Estado factura"
              placeholder="Estado factura"
              name="status"
              disabled={processingInvoice}
              value={invoice.invoice_status}
              options={invoiceStatusOptions}
              onChange={(e) => {
                setInvoice({
                  ...invoice,
                  invoice_status: e.target.value,
                });
              }}
            />
          </div>
        </EntityFormDrawer>
      </div>
    </div>
  );
}
