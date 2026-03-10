import React, { useEffect, useState, useRef } from "react";
import {
  Edit,
  Copy,
  Filter,
  FilterX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Archive,
} from "lucide-react";

type FilterType = "text" | "number" | "select" | "date";

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: string[];
  sortable?: boolean;

  // 👇 NUEVO (opción 3)
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: "left" | "center" | "right";
  // 👇 NUEVO
  padding?: "xs" | "sm" | "md";
  wrap?: boolean; // 👈 NUEVO
  headerAlign?: "left" | "center" | "right";
  headerPadding?: "xs" | "sm" | "md";
  headerWrap?: boolean;
};

type DataTableProps<T> = {
  data: T[];
  filters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  columns: Column<T>[];
  headerComponent?: React.ReactNode;
  expandableRowRender?: (item: T) => React.ReactNode;
  onEdit?: (item: T) => void;
  canEdit?: (item: T) => boolean;
  onCopy?: (item: T) => void;
  onDelete?: (item: T) => void;
  className?: string;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  message?: string;
  enableFilters?: boolean;
  rowStyle?: "default" | "softZebra";
};

function getPaginationRange(
  totalPages: number,
  currentPage: number
): (number | null)[] {
  const delta = 1;
  const range: (number | null)[] = [];
  const rangeWithDots: (number | null)[] = [];
  let l: number | undefined = undefined;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i);
    }
  }

  for (let i = 0; i < range.length; i++) {
    if (typeof l === "number") {
      if ((range[i] as number) - l === 2) {
        rangeWithDots.push(l + 1);
      } else if ((range[i] as number) - l > 2) {
        rangeWithDots.push(null);
      }
    }
    rangeWithDots.push(range[i]);
    l = range[i] as number;
  }
  return rangeWithDots;
}

const DataTable = <T,>({
  data,
  filters,
  onFilterChange,
  columns,
  headerComponent,
  expandableRowRender,
  onEdit,
  canEdit,
  onDelete,
  onCopy,
  className,
  pagination,
  message = "No hay proyectos disponibles",
  enableFilters = false,
  rowStyle = "default",
}: DataTableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
    } else {
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    const col = columns.find((c) => String(c.key) === sortKey);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const aValue = a[col.key];
      const bValue = b[col.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? -1 : 1;
      if (bValue == null) return sortDirection === "asc" ? 1 : -1;

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const aIsNum = !isNaN(aNum) && aValue !== "";
      const bIsNum = !isNaN(bNum) && bValue !== "";

      if (aIsNum && bIsNum) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      return sortDirection === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [data, sortKey, sortDirection, columns]);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // 2️⃣ Paginación después del ordenamiento
  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const filterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeFilter &&
        !Object.values(filterRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node)
        )
      ) {
        setActiveFilter(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeFilter]);

  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const toggleFilter = (key: string) => {
  if (activeFilter === key) {
    setActiveFilter(null);
    setFilterSearch((prev) => ({ ...prev, [key]: "" }));
  } else {
    setActiveFilter(key);
    setFilterSearch((prev) => ({ ...prev, [key]: prev[key] || "" }));
  }
};


  const handleFilterChange = (key: string, value: any) => {
    onFilterChange?.({ ...(filters || {}), [key]: value });
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...(filters || {}) };
    delete newFilters[key];
    onFilterChange?.(newFilters);
  };

  return (
    <div
      className={`relative overflow-x-auto shadow-sm rounded-xl border border-slate-200/80 overflow-hidden ${className}`}
    >
      {headerComponent && <div>{headerComponent}</div>}
      <div className="overflow-auto flex-1 w-full min-h-[250px] bg-white">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-[11px] text-slate-500 font-semibold uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              {expandableRowRender && <th className="w-8 p-2"></th>}
              {columns.map((column) => {
                const filterVal = filters?.[String(column.key)];
                const isFilterActive = Array.isArray(filterVal)
                  ? filterVal.length > 0
                  : filterVal !== undefined && filterVal !== "";
                const isSorted = sortKey === String(column.key);
                return (
                  <th
                    key={String(column.key)}
                    className={`p-4 uppercase font-bold text-xs ${column.headerAlign === "center"
                        ? "text-center"
                        : column.headerAlign === "right"
                          ? "text-right"
                          : "text-left"
                      } ${column.headerPadding
                        ? column.headerPadding === "xs"
                          ? "px-2 py-1"
                          : column.headerPadding === "sm"
                            ? "px-3 py-2"
                            : "px-4 py-3"
                        : "" // 👈 CLAVE: si no se define, queda p-4
                      } ${column.headerWrap ? "whitespace-normal break-words" : ""
                      }`}
                  >
                    {/* 
                      Qué había antes:
                      - Nombre/íconos a la izquierda y filtro en el extremo derecho.
                      Qué cambiamos:
                      - Agrupamos header + orden + filtro en el mismo bloque para que el ícono de filtro
                        quede pegado al nombre de la columna.
                    */}
                    <div className="inline-flex items-center gap-1">
                      <div className="flex items-center gap-1">
                        {/* Ícono de ordenamiento */}
                        {column.sortable !== false && (
                          <button
                            onClick={() => toggleSort(String(column.key))}
                            className={`mr-1 focus:outline-none ${isSorted
                              ? "text-primary-600"
                              : "text-slate-300 hover:text-primary-500"
                              }`}
                            title={
                              isSorted
                                ? sortDirection === "asc"
                                  ? "Orden ascendente"
                                  : "Orden descendente"
                                : "Ordenar"
                            }
                          >
                            {isSorted ? (
                              sortDirection === "asc" ? (
                                <ArrowUp size={16} />
                              ) : (
                                <ArrowDown size={16} />
                              )
                            ) : (
                              <ArrowUpDown size={16} />
                            )}
                          </button>
                        )}
                        {column.header}
                      </div>
                      {enableFilters && column.filterable !== false && (
                        <div
                          className="relative"
                          ref={(el) => {
                            filterRefs.current[String(column.key)] = el;
                          }}
                        >
                          <button
                            onClick={() => toggleFilter(String(column.key))}
                            className={`ml-1 relative ${activeFilter === String(column.key) ||
                              isFilterActive
                              ? "text-primary-500"
                              : "text-slate-300 hover:text-primary-500"
                              } focus:outline-none`}
                            title={
                              isFilterActive
                                ? Array.isArray(filterVal)
                                  ? `Filtro: ${filterVal.join(", ")}`
                                  : `Filtro: ${filterVal}`
                                : "Filtrar"
                            }
                          >
                            {activeFilter === String(column.key) ? (
                              <FilterX size={14} />
                            ) : (
                              <Filter size={14} />
                            )}
                            {isFilterActive && (
                              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-blue-500 border border-white"></span>
                            )}
                          </button>

                          {activeFilter === String(column.key) && (
                            <div
                              className={`absolute z-[9999] ${columns.indexOf(column) === 0
                                ? "left-0"
                                : "right-0"
                                } mt-2 w-48 bg-white rounded-xl shadow-lg p-3 border border-slate-200`}
                            >
                              <div className="p-2">
                                <label className="block text-slate-600 text-xs mb-1">
                                  Filtro
                                </label>

                                {column.filterType === "select" && column.filterOptions ? (
  <>
    <input
      type="text"
      className="border border-slate-200 rounded-lg px-2.5 py-1.5 w-full text-xs text-slate-600 mb-2"
      placeholder="Buscar opción..."
      value={filterSearch[String(column.key)] || ""}
      onChange={(e) =>
        setFilterSearch((prev) => ({
          ...prev,
          [String(column.key)]: e.target.value,
        }))
      }
    />

    <div className="max-h-48 overflow-auto pr-1 text-slate-600">
      {column.filterOptions
        .filter((option) =>
          option
            .toLowerCase()
            .includes((filterSearch[String(column.key)] || "").toLowerCase())
        )
        .map((option) => {
          const current = filters?.[String(column.key)];
          const selected = Array.isArray(current)
            ? current.includes(option)
            : false;

          return (
            <label
              key={option}
              className="flex items-center gap-2 text-xs py-1 text-slate-600"
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  const prev = Array.isArray(current) ? current : [];
                  const next = e.target.checked
                    ? [...prev, option]
                    : prev.filter((v: string) => v !== option);
                  handleFilterChange(String(column.key), next);
                }}
              />
              {option}
            </label>
          );
        })}

      {column.filterOptions.filter((option) =>
        option
          .toLowerCase()
          .includes((filterSearch[String(column.key)] || "").toLowerCase())
      ).length === 0 && (
        <p className="text-xs text-slate-400 py-1">Sin resultados</p>
      )}
    </div>
  </>
) : column.filterType === "date" ? (

                                  <input
                                    type="date"
                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 w-full text-xs text-slate-600"
                                    value={filters?.[String(column.key)] || ""}
                                    onChange={(e) =>
                                      handleFilterChange(
                                        String(column.key),
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : column.filterType === "number" ? (
                                  <input
                                    type="number"
                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 w-full text-xs text-slate-600"
                                    value={filters?.[String(column.key)] || ""}
                                    onChange={(e) =>
                                      handleFilterChange(
                                        String(column.key),
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 w-full text-xs text-slate-600"
                                    placeholder="Search..."
                                    value={filters?.[String(column.key)] || ""}
                                    onChange={(e) =>
                                      handleFilterChange(
                                        String(column.key),
                                        e.target.value
                                      )
                                    }
                                  />
                                )}

                                <div className="flex justify-between mt-2">
                                  <button
                                    className="bg-slate-100 text-xs rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                                    onClick={() =>
                                      clearFilter(String(column.key))
                                    }
                                  >
                                    Clear
                                  </button>
                                  <button
                                    className="bg-primary-600 text-xs rounded-lg px-3 py-1.5 text-white hover:bg-primary-700 transition-colors"
                                    onClick={() => setActiveFilter(null)}
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              {(onEdit || onDelete || onCopy) && (
                <th className="p-4 text-center"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => {
                const isSoftZebra = rowStyle === "softZebra";

                return (
                <React.Fragment key={index}>
                  <tr
                    className={`border-t border-slate-100 text-slate-700 transition-colors ${
                        isSoftZebra
                          ? index % 2 === 0
                            ? "bg-white hover:bg-slate-50 shadow-[inset_0_-1px_0_rgba(15,23,42,0.05)]"
                            : "bg-[#f9f9f9b8] hover:bg-slate-200 shadow-[inset_0_-1px_0_rgba(15,23,42,0.08)]"
                          : index % 2 === 0
                            ? "bg-white hover:bg-slate-50"
                            : "bg-slate-50/50 hover:bg-slate-50"
                      }`}
                  >
                    {expandableRowRender && (
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(index);
                        }}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${expandedRow === index ? "rotate-90" : ""
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`truncate ${column.wrap ? "whitespace-normal break-words" : "whitespace-nowrap"
                          } ${column.align === "center"
                            ? "text-center"
                            : column.align === "right"
                              ? "text-right"
                              : "text-left"
                          } ${column.padding === "xs"
                            ? "px-2 py-1"
                            : column.padding === "sm"
                              ? "px-3 py-2"
                              : "px-4 py-3"
                          }`}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth ?? "100px",
                          maxWidth: column.maxWidth ?? "180px",
                        }}
                        title={!column.wrap ? String(item[column.key]) : undefined}
                      >
                        {column.render
                          ? column.render(item[column.key], item)
                          : String(item[column.key])}
                      </td>
                    ))}
                    {(onEdit || onDelete || onCopy) && (
                      <td
                        className="px-6 py-4 text-center"
                      >
                        <div className="flex justify-center space-x-2">
                          {onEdit && (
                            <button
                              onClick={() => {
                                if ((canEdit?.(item) ?? true) === false) return;
                                onEdit(item);
                              }}
                              disabled={(canEdit?.(item) ?? true) === false}
                              className={`font-medium mr-3 ${
                                (canEdit?.(item) ?? true) === false
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-slate-500 hover:text-slate-700 hover:underline"
                              }`}
                              title={
                                (canEdit?.(item) ?? true) === false
                                  ? "Edición bloqueada para este tipo de movimiento"
                                  : "Editar proyecto"
                              }
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {onCopy && (
                            <button
                              onClick={() => onCopy(item)}
                              className="flex items-center gap-1 text-primary-500 hover:text-primary-700"
                              title="Duplicar proyecto"
                            >
                              <Copy size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(item)}
                              className="font-medium text-amber-500 hover:text-amber-600 hover:underline"
                              title="Archivar"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandableRowRender && expandedRow === index && (
                    <tr className="bg-white">
                      <td
                        colSpan={
                          columns.length + 1 + (onEdit || onDelete ? 1 : 0)
                        }
                      >
                        <div className="p-4">{expandableRowRender(item)}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )})
            ) : (
              <tr>
                <td colSpan={columns.length + 1 + (onEdit || onDelete ? 1 : 0)}>
                  <div className="p-4 text-center text-slate-500 text-sm py-12">{message}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-white z-10 border-t border-slate-200 sticky bottom-0">
        {pagination && sortedData.length > 0 && (
          <nav
            className="bg-white flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
            aria-label="Table navigation"
          >
            <span className="text-xs font-normal text-slate-500">
              Mostrar
              <span className="mx-1 font-semibold text-slate-800">
                {(pagination.page - 1) * pagination.perPage + 1}-
                {Math.min(
                  pagination.page * pagination.perPage,
                  pagination.total
                )}
              </span>
              de
              <span className="ml-1 font-semibold text-slate-800">
                {pagination.total}
              </span>
            </span>
            <ul className="inline-flex items-stretch -space-x-px">
              <li>
                <button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-slate-400 bg-white rounded-l-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
              {getPaginationRange(
                Math.ceil(pagination.total / pagination.perPage),
                pagination.page
              ).map((page, idx) =>
                page === null ? (
                  <li
                    key={`ellipsis-${idx}`}
                    className="flex items-center justify-center text-slate-400 px-2 select-none"
                  >
                    ...
                  </li>
                ) : (
                  <li key={page}>
                    <button
                      onClick={() => pagination.onPageChange(page)}
                      className={`flex items-center justify-center text-sm py-2 px-3 border ${pagination.page === page
                        ? "bg-primary-50 text-primary-700 font-semibold border-primary-200"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      {page}
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={
                    pagination.page ===
                    Math.ceil(pagination.total / pagination.perPage)
                  }
                  className="flex items-center justify-center h-full py-1.5 px-3 text-slate-400 bg-white rounded-r-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};

export default DataTable;
