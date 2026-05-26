import {
  createElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DataTable as BaseDataTable,
  type DataTableColumn,
  type DataTableProps,
} from "@devpablocristo/platform-ui-data-display";

import { formatEntityDisplayName, formatTitleCase } from "./properName";

type LocalDataTableProps<T> = DataTableProps<T> & {
  actionsHeader?: string;
  renderActions?: (item: T) => ReactNode;
};

type DisplayFormat = "properName" | "titleCase" | "none";

const CAMPAIGN_KEYS = new Set([
  "campaign",
  "campaign_name",
  "campaignName",
  "campaignLabel",
]);
const NON_NAME_KEYS = new Set([
  "id",
  "project_id",
  "field_id",
  "lot_id",
  "number",
  "reference_number",
  "date",
  "entry_date",
  "quantity",
  "season",
  "status",
]);

function inferDisplayFormat<T>(column: DataTableColumn<T>): DisplayFormat {
  const key = String(column.key);
  if (
    CAMPAIGN_KEYS.has(key) ||
    NON_NAME_KEYS.has(key) ||
    /campaña|campaign/i.test(column.header)
  ) {
    return "none";
  }
  if (key === "name" || key.endsWith("_name") || key.endsWith("Name")) return "properName";
  if (
    /(cliente|sociedad|customer|proyecto|project|campo|field|lote|lot|cultivo|crop|labor|responsable|manager|inversor|investor|insumo|supply|rubro|category|contratista|contractor|actor)/i.test(
      `${key} ${column.header}`,
    )
  ) {
    return "properName";
  }
  return "none";
}

function formatCellValue(value: unknown, format: DisplayFormat): string {
  if (format === "properName") return formatEntityDisplayName(value);
  if (format === "titleCase") return formatTitleCase(value);
  return String(value ?? "");
}

export function DataTable<T>({
  columns,
  actionsHeader = "Acciones",
  renderActions,
  ...props
}: LocalDataTableProps<T>) {
  const safeData = Array.isArray(props.data) ? props.data : [];

  const columnsWithActions = useMemo(() => {
    const safeColumns = Array.isArray(columns) ? columns : [];
    const displayColumns = safeColumns.map((column) => {
      const format =
        (column as DataTableColumn<T> & { format?: DisplayFormat }).format ??
        inferDisplayFormat(column);
      const formatted: DataTableColumn<T> = {
        ...column,
        header: column.header ? formatTitleCase(column.header) : column.header,
      };

      if (!column.render && format !== "none") {
        formatted.render = (value) => formatCellValue(value, format);
      }

      return formatted;
    });

    if (!renderActions) return displayColumns;

    const actionsColumn: DataTableColumn<T> = {
      key: "__actions" as keyof T,
      header: formatTitleCase(actionsHeader),
      filterable: false,
      sortable: false,
      align: "center",
      headerAlign: "center",
      render: (_value, item) => renderActions(item),
    };

    return [...displayColumns, actionsColumn];
  }, [actionsHeader, columns, renderActions]);

  // Envoltorio con clase `data-table-host` para que `.dark .data-table-host *`
  // overrides en index.css repinten las celdas/headers/dropdowns que la lib
  // externa (@devpablocristo/platform-ui-data-display) tiene con bg-white y
  // text-gray-700 hardcoded sin variants dark:.
  return createElement(
    "div",
    { className: "data-table-host" },
    createElement(BaseDataTable<T>, {
      ...props,
      data: safeData,
      columns: columnsWithActions,
    }),
  );
}

type BuildPaginationOptions = {
  serverSide?: boolean;
};

export function usePagination({ perPage }: { perPage: number }) {
  const [page, setPage] = useState(1);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const clampPageForTotal = useCallback(
    (total: number) => {
      const maxPage = Math.max(1, Math.ceil(total / perPage));
      setPage((current) => Math.min(current, maxPage));
    },
    [perPage]
  );

  const buildPagination = useCallback(
    (total: number, options?: BuildPaginationOptions) => {
      const maxPage = Math.max(1, Math.ceil(total / perPage));

      return {
        page: Math.min(page, maxPage),
        perPage,
        total,
        serverSide: options?.serverSide,
        onPageChange: (nextPage: number) => {
          setPage(Math.min(Math.max(1, nextPage), maxPage));
        },
      };
    },
    [page, perPage]
  );

  return {
    page,
    perPage,
    setPage,
    resetPage,
    clampPageForTotal,
    buildPagination,
  };
}

function rowMatchesFilters<T extends object>(
  row: T,
  filters: Record<string, unknown>
) {
  const record = row as Record<string, unknown>;

  return Object.entries(filters).every(([key, value]) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return true;

    const rowValue = String(record[key] ?? "").toLowerCase();

    if (Array.isArray(value)) {
      return value.some((item) =>
        rowValue.includes(String(item).toLowerCase())
      );
    }

    return rowValue.includes(String(value).toLowerCase());
  });
}

export function useClientTableFilters<T extends object>({
  rows,
  onChange,
}: {
  rows: T[];
  onChange?: () => void;
}) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesFilters(row, filters)),
    [filters, rows]
  );

  const handleFilterChange = useCallback(
    (nextFilters: Record<string, unknown>) => {
      setFilters(nextFilters);
      onChange?.();
    },
    [onChange]
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    onChange?.();
  }, [onChange]);

  const getFilterOptionsForColumn = useCallback(
    (key: keyof T) => {
      const otherFilters = { ...filters };
      delete otherFilters[String(key)];

      return [
        ...new Set(
          rows
            .filter((row) => rowMatchesFilters(row, otherFilters))
            .map((row) => String(row[key] ?? ""))
            .filter(Boolean)
        ),
      ];
    },
    [filters, rows]
  );

  return {
    filters,
    filteredRows,
    getFilterOptionsForColumn,
    handleFilterChange,
    resetFilters,
  };
}
