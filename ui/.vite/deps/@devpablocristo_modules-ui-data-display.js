import {
  require_jsx_runtime
} from "./chunk-NWKZXVHX.js";
import {
  require_react
} from "./chunk-YLDSBLSF.js";
import {
  __toESM
} from "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/modules-ui-data-display/src/DataTable.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function SortNeutralIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "⇅" });
}
function SortAscIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "↑" });
}
function SortDescIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "↓" });
}
function FilterIcon({ active }) {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: active ? "⨯" : "⛃" });
}
function EditIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "✎" });
}
function CopyIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "⎘" });
}
function ArchiveIcon() {
  return (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "🗄" });
}
function getPaginationRange(totalPages, currentPage) {
  const delta = 1;
  const range = [];
  const out = [];
  let previous;
  for (let page = 1; page <= totalPages; page += 1) {
    if (page === 1 || page === totalPages || page >= currentPage - delta && page <= currentPage + delta) {
      range.push(page);
    }
  }
  for (const page of range) {
    if (previous !== void 0) {
      if (page - previous === 2) {
        out.push(previous + 1);
      } else if (page - previous > 2) {
        out.push(null);
      }
    }
    out.push(page);
    previous = page;
  }
  return out;
}
function headerAlignmentClass(column) {
  if (column.headerAlign === "center") return "text-center";
  if (column.headerAlign === "right") return "text-right";
  return "text-left";
}
function cellAlignmentClass(column) {
  if (column.align === "center") return "text-center";
  if (column.align === "right") return "text-right";
  return "text-left";
}
function paddingClass(size) {
  if (size === "xs") return "px-2 py-1";
  if (size === "sm") return "px-3 py-2";
  return "px-4 py-3";
}
function DataTable({
  data,
  filters,
  onFilterChange,
  columns,
  headerComponent,
  expandableRowRender,
  onEdit,
  canEdit,
  onCopy,
  onDelete,
  className,
  pagination,
  message = "No hay registros disponibles",
  enableFilters = false,
  rowStyle = "default"
}) {
  const totalColumns = columns.length + (expandableRowRender ? 1 : 0) + (onEdit || onDelete || onCopy ? 1 : 0);
  const [sortKey, setSortKey] = (0, import_react.useState)(null);
  const [sortDirection, setSortDirection] = (0, import_react.useState)(null);
  const [expandedRow, setExpandedRow] = (0, import_react.useState)(null);
  const [activeFilter, setActiveFilter] = (0, import_react.useState)(null);
  const [filterSearch, setFilterSearch] = (0, import_react.useState)({});
  const filterRefs = (0, import_react.useRef)({});
  (0, import_react.useEffect)(() => {
    const handleClickOutside = (event) => {
      if (activeFilter && !Object.values(filterRefs.current).some((ref) => ref && ref.contains(event.target))) {
        setActiveFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeFilter]);
  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
      return;
    }
    setSortDirection("asc");
  };
  const sortedData = (0, import_react.useMemo)(() => {
    if (!sortKey || !sortDirection) return data;
    const column = columns.find((item) => String(item.key) === sortKey);
    if (!column) return data;
    return [...data].sort((left, right) => {
      const aValue = left[column.key];
      const bValue = right[column.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? -1 : 1;
      if (bValue == null) return sortDirection === "asc" ? 1 : -1;
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const aIsNum = !Number.isNaN(aNum) && aValue !== "";
      const bIsNum = !Number.isNaN(bNum) && bValue !== "";
      if (aIsNum && bIsNum) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortDirection === "asc" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
  }, [columns, data, sortDirection, sortKey]);
  const paginatedData = (0, import_react.useMemo)(() => {
    if (!pagination) return sortedData;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return sortedData.slice(start, end);
  }, [pagination, sortedData]);
  const toggleRow = (index) => {
    setExpandedRow((current) => current === index ? null : index);
  };
  const toggleFilter = (key) => {
    setFilterSearch((prev) => ({ ...prev, [key]: prev[key] ?? "" }));
    setActiveFilter((current) => current === key ? null : key);
  };
  const handleFilterChange = (key, value) => {
    onFilterChange == null ? void 0 : onFilterChange({ ...filters ?? {}, [key]: value });
  };
  const clearFilter = (key) => {
    const next = { ...filters ?? {} };
    delete next[key];
    onFilterChange == null ? void 0 : onFilterChange(next);
  };
  return (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: `relative overflow-hidden rounded-xl border border-slate-200/80 shadow-sm ${className ?? ""}`.trim(),
      children: [
        headerComponent ? (0, import_jsx_runtime.jsx)("div", { children: headerComponent }) : null,
        (0, import_jsx_runtime.jsx)("div", { className: "min-h-[250px] w-full overflow-auto bg-white", children: (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-sm text-gray-700", children: [
          (0, import_jsx_runtime.jsx)("thead", { className: "border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500", children: (0, import_jsx_runtime.jsxs)("tr", { children: [
            expandableRowRender ? (0, import_jsx_runtime.jsx)("th", { className: "w-8 p-2" }) : null,
            columns.map((column, index) => {
              const filterValue = filters == null ? void 0 : filters[String(column.key)];
              const isFilterActive = Array.isArray(filterValue) ? filterValue.length > 0 : filterValue !== void 0 && filterValue !== "";
              const isSorted = sortKey === String(column.key);
              return (0, import_jsx_runtime.jsx)(
                "th",
                {
                  className: `${headerAlignmentClass(column)} ${paddingClass(column.headerPadding)} ${column.headerWrap ? "whitespace-normal break-words" : ""} text-xs font-bold uppercase`,
                  children: (0, import_jsx_runtime.jsxs)("div", { className: "inline-flex items-center gap-1", children: [
                    (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-1", children: [
                      column.sortable !== false ? (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleSort(String(column.key)),
                          className: `mr-1 focus:outline-none ${isSorted ? "text-primary-600" : "text-slate-300 hover:text-primary-500"}`,
                          title: isSorted ? sortDirection === "asc" ? "Orden ascendente" : "Orden descendente" : "Ordenar",
                          children: isSorted ? sortDirection === "asc" ? (0, import_jsx_runtime.jsx)(SortAscIcon, {}) : (0, import_jsx_runtime.jsx)(SortDescIcon, {}) : (0, import_jsx_runtime.jsx)(SortNeutralIcon, {})
                        }
                      ) : null,
                      column.header
                    ] }),
                    enableFilters && column.filterable !== false ? (0, import_jsx_runtime.jsxs)(
                      "div",
                      {
                        className: "relative",
                        ref: (element) => {
                          filterRefs.current[String(column.key)] = element;
                        },
                        children: [
                          (0, import_jsx_runtime.jsxs)(
                            "button",
                            {
                              type: "button",
                              onClick: () => toggleFilter(String(column.key)),
                              className: `relative ml-1 focus:outline-none ${activeFilter === String(column.key) || isFilterActive ? "text-primary-500" : "text-slate-300 hover:text-primary-500"}`,
                              title: isFilterActive ? "Filtro activo" : "Filtrar",
                              children: [
                                (0, import_jsx_runtime.jsx)(FilterIcon, { active: activeFilter === String(column.key) }),
                                isFilterActive ? (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0 top-0 block h-2 w-2 rounded-full border border-white bg-blue-500" }) : null
                              ]
                            }
                          ),
                          activeFilter === String(column.key) ? (0, import_jsx_runtime.jsx)(
                            "div",
                            {
                              className: `absolute z-[9999] mt-2 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${index === 0 ? "left-0" : "right-0"}`,
                              children: (0, import_jsx_runtime.jsxs)("div", { className: "p-2", children: [
                                (0, import_jsx_runtime.jsx)("label", { className: "mb-1 block text-xs text-slate-600", children: "Filtro" }),
                                column.filterType === "select" && column.filterOptions ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                                  (0, import_jsx_runtime.jsx)(
                                    "input",
                                    {
                                      type: "text",
                                      className: "mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600",
                                      placeholder: "Buscar opción...",
                                      value: filterSearch[String(column.key)] || "",
                                      onChange: (event) => setFilterSearch((prev) => ({
                                        ...prev,
                                        [String(column.key)]: event.target.value
                                      }))
                                    }
                                  ),
                                  (0, import_jsx_runtime.jsxs)("div", { className: "max-h-48 overflow-auto pr-1 text-slate-600", children: [
                                    column.filterOptions.filter(
                                      (option) => option.toLowerCase().includes(
                                        (filterSearch[String(column.key)] || "").toLowerCase()
                                      )
                                    ).map((option) => {
                                      const current = filters == null ? void 0 : filters[String(column.key)];
                                      const selected = Array.isArray(current) ? current.includes(option) : false;
                                      return (0, import_jsx_runtime.jsxs)(
                                        "label",
                                        {
                                          className: "flex items-center gap-2 py-1 text-xs text-slate-600",
                                          children: [
                                            (0, import_jsx_runtime.jsx)(
                                              "input",
                                              {
                                                type: "checkbox",
                                                checked: selected,
                                                onChange: (event) => {
                                                  const prev = Array.isArray(current) ? current : [];
                                                  const next = event.target.checked ? [...prev, option] : prev.filter((value) => value !== option);
                                                  handleFilterChange(String(column.key), next);
                                                }
                                              }
                                            ),
                                            option
                                          ]
                                        },
                                        option
                                      );
                                    }),
                                    column.filterOptions.filter(
                                      (option) => option.toLowerCase().includes((filterSearch[String(column.key)] || "").toLowerCase())
                                    ).length === 0 ? (0, import_jsx_runtime.jsx)("p", { className: "py-1 text-xs text-slate-400", children: "Sin resultados" }) : null
                                  ] })
                                ] }) : (0, import_jsx_runtime.jsx)(
                                  "input",
                                  {
                                    type: column.filterType === "date" ? "date" : column.filterType === "number" ? "number" : "text",
                                    className: "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600",
                                    placeholder: column.filterType === "text" ? "Buscar..." : void 0,
                                    value: typeof (filters == null ? void 0 : filters[String(column.key)]) === "string" || typeof (filters == null ? void 0 : filters[String(column.key)]) === "number" ? String(filters == null ? void 0 : filters[String(column.key)]) : "",
                                    onChange: (event) => handleFilterChange(String(column.key), event.target.value)
                                  }
                                ),
                                (0, import_jsx_runtime.jsxs)("div", { className: "mt-2 flex justify-between", children: [
                                  (0, import_jsx_runtime.jsx)(
                                    "button",
                                    {
                                      type: "button",
                                      className: "rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-200",
                                      onClick: () => clearFilter(String(column.key)),
                                      children: "Limpiar"
                                    }
                                  ),
                                  (0, import_jsx_runtime.jsx)(
                                    "button",
                                    {
                                      type: "button",
                                      className: "rounded-lg bg-primary-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-primary-700",
                                      onClick: () => setActiveFilter(null),
                                      children: "Aplicar"
                                    }
                                  )
                                ] })
                              ] })
                            }
                          ) : null
                        ]
                      }
                    ) : null
                  ] })
                },
                String(column.key)
              );
            }),
            onEdit || onDelete || onCopy ? (0, import_jsx_runtime.jsx)("th", { className: "p-4 text-center" }) : null
          ] }) }),
          (0, import_jsx_runtime.jsx)("tbody", { children: paginatedData.length > 0 ? paginatedData.map((item, index) => {
            const zebraClass = rowStyle === "softZebra" ? index % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-[#f9f9f9b8] hover:bg-slate-200" : index % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-50";
            return (0, import_jsx_runtime.jsxs)(import_react.default.Fragment, { children: [
              (0, import_jsx_runtime.jsxs)("tr", { className: `border-t border-slate-100 text-slate-700 transition-colors ${zebraClass}`, children: [
                expandableRowRender ? (0, import_jsx_runtime.jsx)(
                  "td",
                  {
                    className: "cursor-pointer px-4 py-3",
                    onClick: (event) => {
                      event.stopPropagation();
                      toggleRow(index);
                    },
                    children: (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        className: `inline-block transition-transform duration-200 ${expandedRow === index ? "rotate-90" : ""}`,
                        children: "▶"
                      }
                    )
                  }
                ) : null,
                columns.map((column) => (0, import_jsx_runtime.jsx)(
                  "td",
                  {
                    className: `${cellAlignmentClass(column)} ${paddingClass(column.padding)} ${column.wrap ? "whitespace-normal break-words" : "whitespace-nowrap truncate"}`,
                    style: {
                      width: column.width,
                      minWidth: column.minWidth ?? "100px",
                      maxWidth: column.maxWidth ?? "180px"
                    },
                    title: !column.wrap ? String(item[column.key] ?? "") : void 0,
                    children: column.render ? column.render(item[column.key], item) : String(item[column.key] ?? "")
                  },
                  String(column.key)
                )),
                onEdit || onDelete || onCopy ? (0, import_jsx_runtime.jsx)("td", { className: "px-6 py-4 text-center", children: (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-center space-x-2", children: [
                  onEdit ? (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        if (((canEdit == null ? void 0 : canEdit(item)) ?? true) === false) return;
                        onEdit(item);
                      },
                      disabled: ((canEdit == null ? void 0 : canEdit(item)) ?? true) === false,
                      className: `mr-3 font-medium ${((canEdit == null ? void 0 : canEdit(item)) ?? true) === false ? "cursor-not-allowed text-slate-300" : "text-slate-500 hover:text-slate-700 hover:underline"}`,
                      title: ((canEdit == null ? void 0 : canEdit(item)) ?? true) === false ? "Edición bloqueada" : "Editar",
                      children: (0, import_jsx_runtime.jsx)(EditIcon, {})
                    }
                  ) : null,
                  onCopy ? (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => onCopy(item),
                      className: "flex items-center gap-1 text-primary-500 hover:text-primary-700",
                      title: "Duplicar",
                      children: (0, import_jsx_runtime.jsx)(CopyIcon, {})
                    }
                  ) : null,
                  onDelete ? (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => onDelete(item),
                      className: "font-medium text-amber-500 hover:text-amber-600 hover:underline",
                      title: "Archivar",
                      children: (0, import_jsx_runtime.jsx)(ArchiveIcon, {})
                    }
                  ) : null
                ] }) }) : null
              ] }),
              expandableRowRender && expandedRow === index ? (0, import_jsx_runtime.jsx)("tr", { className: "bg-white", children: (0, import_jsx_runtime.jsx)("td", { colSpan: totalColumns, children: (0, import_jsx_runtime.jsx)("div", { className: "p-4", children: expandableRowRender(item) }) }) }) : null
            ] }, index);
          }) : (0, import_jsx_runtime.jsx)("tr", { children: (0, import_jsx_runtime.jsx)("td", { colSpan: totalColumns, children: (0, import_jsx_runtime.jsx)("div", { className: "p-4 py-12 text-center text-sm text-slate-500", children: message }) }) }) })
        ] }) }),
        (0, import_jsx_runtime.jsx)("div", { className: "sticky bottom-0 z-10 border-t border-slate-200 bg-white", children: pagination && sortedData.length > 0 ? (0, import_jsx_runtime.jsxs)(
          "nav",
          {
            className: "flex flex-col items-start justify-between space-y-3 bg-white p-4 md:flex-row md:items-center md:space-y-0",
            "aria-label": "Table navigation",
            children: [
              (0, import_jsx_runtime.jsxs)("span", { className: "text-xs font-normal text-slate-500", children: [
                "Mostrar",
                (0, import_jsx_runtime.jsxs)("span", { className: "mx-1 font-semibold text-slate-800", children: [
                  (pagination.page - 1) * pagination.perPage + 1,
                  "-",
                  Math.min(pagination.page * pagination.perPage, pagination.total)
                ] }),
                "de",
                (0, import_jsx_runtime.jsx)("span", { className: "ml-1 font-semibold text-slate-800", children: pagination.total })
              ] }),
              (0, import_jsx_runtime.jsxs)("ul", { className: "inline-flex items-stretch -space-x-px", children: [
                (0, import_jsx_runtime.jsx)("li", { children: (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: () => pagination.onPageChange(pagination.page - 1),
                    disabled: pagination.page === 1,
                    className: "ml-0 flex h-full items-center justify-center rounded-l-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                    children: "‹"
                  }
                ) }),
                getPaginationRange(Math.ceil(pagination.total / pagination.perPage), pagination.page).map(
                  (page, index) => page === null ? (0, import_jsx_runtime.jsx)("li", { className: "select-none px-2 text-slate-400", children: "..." }, `ellipsis-${index}`) : (0, import_jsx_runtime.jsx)("li", { children: (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: () => pagination.onPageChange(page),
                      className: `border px-3 py-2 text-sm ${pagination.page === page ? "border-primary-200 bg-primary-50 font-semibold text-primary-700" : "bg-white text-slate-600 hover:bg-slate-50"}`,
                      children: page
                    }
                  ) }, page)
                ),
                (0, import_jsx_runtime.jsx)("li", { children: (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: () => pagination.onPageChange(pagination.page + 1),
                    disabled: pagination.page === Math.ceil(pagination.total / pagination.perPage),
                    className: "flex h-full items-center justify-center rounded-r-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                    children: "›"
                  }
                ) })
              ] })
            ]
          }
        ) : null })
      ]
    }
  );
}

// node_modules/@devpablocristo/modules-ui-data-display/src/SubTable.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function SubTable({ data, columns, className }) {
  return (0, import_jsx_runtime2.jsx)("div", { className: `overflow-x-auto rounded-xl ${className ?? ""}`.trim(), children: (0, import_jsx_runtime2.jsxs)("table", { className: "w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-sm text-slate-700 shadow-sm", children: [
    (0, import_jsx_runtime2.jsx)("thead", { className: "border-b border-slate-200 bg-slate-50 text-slate-600", children: (0, import_jsx_runtime2.jsx)("tr", { children: columns.map((column) => (0, import_jsx_runtime2.jsx)("th", { className: "px-4 py-2 text-[11px] font-semibold uppercase tracking-wider", children: column.header }, String(column.key))) }) }),
    (0, import_jsx_runtime2.jsx)("tbody", { children: data.map((item, index) => (0, import_jsx_runtime2.jsx)(
      "tr",
      {
        className: "border-t border-slate-100 font-normal transition-colors duration-150 hover:bg-slate-50",
        children: columns.map((column) => (0, import_jsx_runtime2.jsx)("td", { className: "px-4 py-2 font-normal", children: column.render ? column.render(item[column.key], item) : String(item[column.key] ?? "") }, String(column.key)))
      },
      index
    )) })
  ] }) });
}
export {
  DataTable,
  SubTable
};
//# sourceMappingURL=@devpablocristo_modules-ui-data-display.js.map
