import {
  require_jsx_runtime
} from "./chunk-NWKZXVHX.js";
import {
  require_react
} from "./chunk-YLDSBLSF.js";
import {
  __toESM
} from "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/core-browser/src/search/SearchInput.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoComplete = "off",
  rootClassName,
  inputClassName,
  clearLabel = "Limpiar búsqueda"
}) {
  const handleChange = (event) => {
    onChange(event.target.value);
  };
  return (0, import_jsx_runtime.jsxs)("div", { className: ["page-search", rootClassName].filter(Boolean).join(" ").trim(), children: [
    (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "search",
        className: ["page-search__input", inputClassName].filter(Boolean).join(" ").trim(),
        placeholder,
        autoComplete,
        value,
        onChange: handleChange,
        "aria-label": ariaLabel ?? placeholder
      }
    ),
    value.length > 0 ? (0, import_jsx_runtime.jsx)(
      "button",
      {
        className: "page-search__clear",
        onClick: () => onChange(""),
        "aria-label": clearLabel,
        type: "button",
        children: "×"
      }
    ) : null
  ] });
}

// node_modules/@devpablocristo/core-browser/src/search/PageSearchProvider.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var PageSearchContext = (0, import_react.createContext)({
  query: "",
  setQuery: () => {
  },
  register: () => () => {
  },
  visible: false,
  placeholder: "Search..."
});
var PageSearchShellContext = (0, import_react.createContext)(false);
function usePageSearchShellControl() {
  const { query, setQuery, visible, placeholder } = (0, import_react.useContext)(PageSearchContext);
  return {
    query,
    visible,
    placeholder,
    setQuery,
    clear: () => setQuery("")
  };
}

// node_modules/@devpablocristo/core-browser/src/crud/CrudPageShell.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function CrudPageShell({
  title,
  subtitle,
  headerLeadSlot,
  search: search2,
  headerActions,
  error,
  form,
  toolbar,
  children
}) {
  return (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    (0, import_jsx_runtime3.jsxs)("div", { className: "page-header crud-page-shell__header", children: [
      (0, import_jsx_runtime3.jsxs)("div", { className: "crud-page-shell__header-main", children: [
        (0, import_jsx_runtime3.jsx)("h1", { className: "crud-page-shell__title", children: title }),
        subtitle != null && subtitle !== false ? (0, import_jsx_runtime3.jsx)("p", { className: "text-secondary", children: subtitle }) : null,
        headerLeadSlot != null ? headerLeadSlot : null
      ] }),
      search2 != null || headerActions != null ? (0, import_jsx_runtime3.jsxs)("div", { className: "crud-page-shell__header-actions", children: [
        search2 != null ? (0, import_jsx_runtime3.jsx)("div", { className: "crud-list-header-search", children: (0, import_jsx_runtime3.jsx)(
          SearchInput,
          {
            value: search2.value,
            onChange: search2.onChange,
            placeholder: search2.placeholder ?? "Buscar...",
            ariaLabel: search2.ariaLabel,
            inputClassName: search2.inputClassName,
            clearLabel: search2.clearLabel
          }
        ) }) : null,
        headerActions != null ? (0, import_jsx_runtime3.jsx)("div", { className: "actions-row", children: headerActions }) : null
      ] }) : null
    ] }),
    error,
    form,
    toolbar,
    children
  ] });
}

// node_modules/@devpablocristo/core-browser/src/crud/PageLayout.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
function isPrimitiveLead(lead) {
  return typeof lead === "string" || typeof lead === "number";
}
function PageLayout({ title, lead, actions, banner, className, searchClearLabel, children }) {
  const stackClass = ["page-stack", className].filter(Boolean).join(" ");
  const pageSearch = usePageSearchShellControl();
  const hasSearch = pageSearch.visible;
  const primitiveLead = lead != null && lead !== false && isPrimitiveLead(lead) ? lead : void 0;
  const richLead = lead != null && lead !== false && !isPrimitiveLead(lead) ? (0, import_jsx_runtime4.jsx)("div", { className: "text-page-lead", children: lead }) : void 0;
  return (0, import_jsx_runtime4.jsx)("div", { className: stackClass, children: (0, import_jsx_runtime4.jsx)(
    CrudPageShell,
    {
      title,
      subtitle: primitiveLead,
      headerLeadSlot: richLead,
      search: hasSearch ? {
        value: pageSearch.query,
        onChange: pageSearch.setQuery,
        placeholder: pageSearch.placeholder,
        clearLabel: searchClearLabel ?? "Clear search"
      } : void 0,
      headerActions: actions,
      children: (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        banner,
        children
      ] })
    }
  ) });
}

// node_modules/@devpablocristo/core-browser/src/crud/listParsing.ts
function parseListItemsFromResponse(input) {
  const queue = [input];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      return current;
    }
    if (current == null || typeof current !== "object" || seen.has(current)) {
      continue;
    }
    seen.add(current);
    const envelope = current;
    if (Array.isArray(envelope.items)) {
      return envelope.items;
    }
    if ("data" in envelope) {
      queue.push(envelope.data);
    }
    if ("items" in envelope) {
      queue.push(envelope.items);
    }
  }
  return [];
}
function parsePaginatedResponse(input) {
  const items = parseListItemsFromResponse(input);
  let hasMore = false;
  let nextCursor = "";
  if (input != null && typeof input === "object" && !Array.isArray(input)) {
    const envelope = input;
    hasMore = Boolean(envelope.has_more);
    nextCursor = String(envelope.next_cursor ?? "");
  }
  return { items, hasMore, nextCursor };
}
export {
  CrudPageShell,
  PageLayout,
  parseListItemsFromResponse,
  parsePaginatedResponse
};
//# sourceMappingURL=@devpablocristo_core-browser_crud.js.map
