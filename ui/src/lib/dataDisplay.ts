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

type LocalDataTableProps<T> = DataTableProps<T> & {
  actionsHeader?: string;
  renderActions?: (item: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  actionsHeader = "Acciones",
  renderActions,
  ...props
}: LocalDataTableProps<T>) {
  const safeData = Array.isArray(props.data) ? props.data : [];

  const columnsWithActions = useMemo(() => {
    const safeColumns = Array.isArray(columns) ? columns : [];

    if (!renderActions) return safeColumns;

    const actionsColumn: DataTableColumn<T> = {
      key: "__actions" as keyof T,
      header: actionsHeader,
      filterable: false,
      sortable: false,
      align: "center",
      headerAlign: "center",
      render: (_value, item) => renderActions(item),
    };

    return [...safeColumns, actionsColumn];
  }, [actionsHeader, columns, renderActions]);

  return createElement(BaseDataTable<T>, {
    ...props,
    data: safeData,
    columns: columnsWithActions,
  });
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
