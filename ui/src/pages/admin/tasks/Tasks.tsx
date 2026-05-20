import { JSX, useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Archive, Briefcase, Download, ClockIcon, CheckIcon, FileTextIcon, FileXIcon, Plus, SlidersHorizontal, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import { WarningBanner } from "../../../components/feedback/WarningBanner";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../hooks/useBulkActions";

import useLabors from "../../../hooks/useLabors";
import useWorkOrders from "../../../hooks/useWorkOrders";
import useCategories from "../../../hooks/useCategories";
import { DataTable, usePagination } from "@/lib/dataDisplay";
import { InvoiceData, Metrics, LaborGroupData } from "../../../hooks/useLabors/types";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { BaseModal } from "../../../components/Modal/BaseModal";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import { cropColors, laborColors } from "../../../pages/admin/colors";
import { Column } from "../../../pages/admin/types";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeDate } from "../utils";
import { WORKORDER_ENTITY } from "../entities";
import { buildTimestampedFilename, downloadBlob, CSV_ACCEPT } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import ArchivedWorkOrders from "../database/work-orders/ArchivedWorkOrders";
import TasksForm, { type Labor as LaborRow } from "../database/tasks/TasksForm";

const LABOR_HEADER_ALIASES = {
  name: ["labor", "nombre", "name"],
  category: ["rubro", "categoria", "category"],
  price: ["precio", "precio_usd", "usd", "u$s"],
  contractor: ["contratista", "contractor", "proveedor"],
} as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  // Strip BOM + sep= hint so files exported by the BE re-import cleanly.
  const cleaned = content.replace(/^﻿/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^sep=.$/i.test(line));

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => normalizeText(h));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

function getValueByAliases(row: Record<string, string>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }
  return "";
}

const statusConfig: Record<string, { classes: string; icon: JSX.Element }> = {
  Pendiente: {
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <ClockIcon className="w-3.5 h-3.5" />,
  },
  Pagada: {
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckIcon className="w-3.5 h-3.5" />,
  },
  Facturada: {
    classes: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <FileTextIcon className="w-3.5 h-3.5" />,
  },
  NoFacturada: {
    classes: "bg-gray-50 text-gray-500 border border-gray-200",
    icon: <FileXIcon className="w-3.5 h-3.5" />,
  },
};

const invoiceEmptyStatus = "NoFacturada";

const invoiceStatusOptions = [
  { id: 1, name: "Pendiente" },
  { id: 2, name: "Pagada" },
  { id: 3, name: "Facturada" },
];

function LaborsHeader({
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  allColumns,
}: {
  selectedColumns: Array<keyof LaborGroupData>;
  setSelectedColumns: (columns: Array<keyof LaborGroupData>) => void;
  setVisibleColumns: (columns: Array<keyof LaborGroupData>) => void;
  allColumns: Column<LaborGroupData>[];
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
                    setSelectedColumns(selectedColumns.filter((k) => k !== col.key));
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

function TasksIndicators({
  metrics,
  processing,
  laborsAmount,
}: {
  metrics: Metrics;
  processing: boolean;
  laborsAmount: number;
}) {
  return (
    <div>
      {processing ? (
        <InlineSpinner
          label="Cargando indicadores..."
          spinnerClassName="text-custom-btn"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <IndicatorCard
            title="Superficie total"
            value={formatNumberAr(metrics.surface_ha) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Costo promedio / Ha"
            value={"u$ " + formatNumberAr(metrics.avg_cost_per_ha)}
            color="red"
          />
          <IndicatorCard
            title="Total u$ / Neto"
            value={"u$ " + formatNumberAr(metrics.net_total_cost)}
            color="red"
          />
          <IndicatorCard
            title="Cantidad Total de Labores"
            value={formatNumberAr(laborsAmount)}
            color="blue"
          />
        </div>
      )}
    </div>
  );
}

export function Tasks() {
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

  const { categories, getCategories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [importedRows, setImportedRows] = useState<LaborRow[] | undefined>(undefined);

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

          const val = String(task[k as keyof LaborGroupData] ?? "").toLowerCase();

          if (Array.isArray(value)) {
            return value.some((v) => val.includes(String(v).toLowerCase()));
          }

          return val.includes(String(value).toLowerCase());
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
        render: (value) => <strong className="text-gray-900">{String(value ?? "")}</strong>,
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
          <span className="font-semibold text-gray-900">
            {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}{" "}
            <span className="text-gray-900 font-normal text-xs">Has</span>
          </span>
        ),
      },
      {
        key: "cost_ha",
        header: "Costo $/Ha",
        filterable: true,
        filterOptions: getFilterOptionsForColumn("cost_ha", laborGroups, taskFilters),
        render: (value) => (
          <span className="font-bold text-gray-900">
            $ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "net_total",
        header: "Total $ Neto",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900">
            $ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "total_iva",
        header: "Total $ IVA",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900">
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
          <span className="font-bold text-gray-900">
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
          <span className="font-bold text-gray-900">
            u$ {formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0)}
          </span>
        ),
      },
      {
        key: "usd_net_total",
        header: "Total u$ Neto",
        filterable: false,
        render: (value) => (
          <span className="font-bold text-gray-900">
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
            className="block w-full min-w-[80px] py-1 px-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-sm disabled:opacity-50"
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
            className="block w-full min-w-[80px] py-1 px-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-sm disabled:opacity-50"
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
                className="block w-full min-w-[80px] py-1 px-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-sm disabled:opacity-50"
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
            classes: "bg-gray-100 text-gray-700",
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
    getCategories("");

    if (!hasWorkspaceSelection) return;

    getLaborGroups(laborQuery);
    getMetrics(laborQuery);
  }, [hasWorkspaceSelection, laborQuery, getLaborGroups, getMetrics, getCategories, resetPage]);

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
        const taskValRaw = task[key as keyof LaborGroupData];
        const taskVal = String(taskValRaw ?? "").toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) => taskVal === String(v).toLowerCase());
        }

        return taskVal === String(value).toLowerCase();
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

  const handleImportLaborsFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setWarningMessage("Para importar labores, seleccioná un proyecto.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv") || file.type.includes("csv");

    if (!isCsv) {
      setImportError("Formato no soportado. Use .csv.");
      return;
    }

    try {
      setImportError(null);
      setImportMessage(null);

      const text = await file.text();
      const parsedRows = parseCsv(text);

      if (parsedRows.length === 0) {
        setImportError("El archivo no tiene datos válidos. Verifique encabezados y filas.");
        return;
      }

      const categoryByName = new Map(categories.map((c) => [normalizeText(c.name), c]));

      // Map every CSV row (good or bad) to a Labor row and hand them off to the
      // editable preview in TasksForm. The user fixes invalid cells inline and
      // hits Guardar — no row is silently dropped.
      const previewRows: LaborRow[] = [];
      parsedRows.forEach((rawRow) => {
        const name = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.name).trim();
        const categoryRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.category).trim();
        const priceRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.price).trim();
        const contractor = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.contractor).trim();
        if (!name && !categoryRaw && !priceRaw && !contractor) return;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const priceValue = Number(priceRaw.replace(/\$/g, "").replace(",", "."));
        previewRows.push({
          id: previewRows.length,
          name,
          category:
            categoryId && !Number.isNaN(categoryId) ? String(categoryId) : "",
          price:
            !Number.isNaN(priceValue) && priceValue > 0 ? String(priceValue) : priceRaw,
          contractor,
          is_partial_price: false,
        });
      });

      if (previewRows.length === 0) {
        setImportError("No se encontraron filas importables en el archivo.");
        return;
      }

      setImportedRows(previewRows);
      setCreateDrawerOpen(true);
    } catch {
      setImportError("No se pudo leer el archivo. Use .csv.");
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
      <input
        ref={fileInputRef}
        type="file"
        accept={CSV_ACCEPT}
        onChange={handleImportLaborsFromFile}
        className="hidden"
      />
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => fileInputRef.current?.click(),
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
                "una labor",
              );
              if (warning) {
                setWarningMessage(warning);
                return;
              }
              setWarningMessage(null);
              setCreateDrawerOpen(true);
            },
          },
        ]}
      />
      <WarningBanner
        message={warningMessage}
        onDismiss={() => setWarningMessage(null)}
      />
      <DrawerShell
        open={createDrawerOpen}
        onClose={() => {
          setCreateDrawerOpen(false);
          setImportedRows(undefined);
        }}
        title={importedRows ? "Importar labores" : "Nueva Labor"}
      >
        <TasksForm
          hideWorkspaceFilters
          initialRows={importedRows}
          onCancel={() => {
            setCreateDrawerOpen(false);
            setImportedRows(undefined);
          }}
        />
      </DrawerShell>
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Órdenes de trabajo archivadas (por labor)"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        {/* En esta página "Labores" se archivan work-orders (no entradas del catálogo
            de labors), por lo que el drawer muestra órdenes de trabajo archivadas. */}
        <ArchivedWorkOrders onAfterRestore={refreshLabors} />
      </ArchivedDrawer>
      {hasWorkspaceSelection && (
      <div className="my-3">
        {errorMetrics ? (
          <ErrorBanner message={errorMetrics} variant="outlined" prefix="Error:" />
        ) : (
          <TasksIndicators
            metrics={derivedMetrics}
            processing={processing}
            laborsAmount={filteredTasks.length}
          />
        )}
      </div>
      )}

      <div className="mt-3 relative">
        <LoadingOverlay show={hasWorkspaceSelection && processing} />
        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver labores"
            description="El listado no carga datos globales automáticamente."
          />
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
            <DataTable
              key={laborGroups.length}
              data={selectableTasks}
              rowStyle="softZebra"
              columns={columnsWithSelection}
              filters={taskFilters}
              onFilterChange={handleFilterChange}
              className={`${processing ? "pointer-events-none opacity-60" : ""}`}
              enableFilters={true}
              message="No hay labores disponibles"
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
        <SuccessBanner message={importMessage} variant="outlined" />
        {!showInvoiceModal && (
          <SuccessBanner message={resultInvoiceMessage} variant="outlined" />
        )}
        {!showInvoiceModal && (
          <ErrorBanner
            message={errorInvoiceMessage}
            variant="outlined"
            prefix="Error:"
          />
        )}
        <ErrorBanner
          message={importError || exportErrorMessage || error}
          variant="outlined"
          prefix="Error:"
        />
      </div>
    </div>
  );
}
