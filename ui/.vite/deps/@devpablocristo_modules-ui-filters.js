import {
  require_jsx_runtime
} from "./chunk-NWKZXVHX.js";
import {
  require_react
} from "./chunk-YLDSBLSF.js";
import {
  __toESM
} from "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/modules-ui-filters/src/FilterBar.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function sizeClass(size) {
  return size === "sm" ? "px-3.5 py-2 text-sm" : "px-3.5 py-2.5 text-sm";
}
function buttonClass(variant, isPrimary) {
  const resolved = variant ?? (isPrimary ? "success" : "outlineGreen");
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.97]";
  switch (resolved) {
    case "secondary":
      return `${base} bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200`;
    case "danger":
      return `${base} bg-red-600 text-white shadow-sm hover:bg-red-700`;
    case "warning":
      return `${base} bg-amber-500 text-white shadow-sm hover:bg-amber-600`;
    case "light":
      return `${base} border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50`;
    case "dark":
      return `${base} bg-slate-800 text-white shadow-sm hover:bg-slate-900`;
    case "outlineGray":
      return `${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
    case "outlineGreen":
    case "outlinePonti":
      return `${base} border border-custom-btn bg-transparent text-custom-btn hover:bg-primary-50`;
    case "success":
      return `${base} bg-custom-btn text-white shadow-sm hover:bg-custom-btn/85`;
    default:
      return `${base} bg-primary-700 text-white shadow-sm hover:bg-primary-800`;
  }
}
function ActionButtonView({
  action,
  size
}) {
  const classes = `${buttonClass(action.variant, action.isPrimary)} ${sizeClass(size)} whitespace-nowrap ${action.disabled ? "cursor-not-allowed opacity-50 active:scale-100" : ""}`;
  if (action.onFileChange) {
    return (0, import_jsx_runtime.jsxs)("label", { className: `${classes} relative overflow-hidden ${action.disabled ? "pointer-events-none" : ""}`.trim(), children: [
      (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "file",
          className: "absolute inset-0 h-full w-full cursor-pointer opacity-0",
          accept: action.accept,
          disabled: action.disabled,
          onClick: (event) => {
            event.currentTarget.value = "";
          },
          onChange: (event) => {
            var _a;
            (_a = action.onFileChange) == null ? void 0 : _a.call(action, event);
            requestAnimationFrame(() => {
              event.target.value = "";
            });
          }
        }
      ),
      action.icon ? (0, import_jsx_runtime.jsx)("span", { children: action.icon }) : null,
      (0, import_jsx_runtime.jsx)("span", { children: action.label })
    ] });
  }
  if (action.href) {
    return (0, import_jsx_runtime.jsxs)("a", { href: action.href, className: classes, "aria-disabled": action.disabled ? "true" : void 0, children: [
      action.icon ? (0, import_jsx_runtime.jsx)("span", { children: action.icon }) : null,
      (0, import_jsx_runtime.jsx)("span", { children: action.label })
    ] });
  }
  return (0, import_jsx_runtime.jsxs)("button", { type: "button", className: classes, disabled: action.disabled, onClick: action.disabled ? void 0 : action.onClick, children: [
    action.icon ? (0, import_jsx_runtime.jsx)("span", { children: action.icon }) : null,
    (0, import_jsx_runtime.jsx)("span", { children: action.label })
  ] });
}
function SearchInput({
  label,
  name,
  value,
  disabled,
  onClick,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  size
}) {
  return (0, import_jsx_runtime.jsxs)("div", { className: "w-full", children: [
    label ? (0, import_jsx_runtime.jsx)("label", { className: "mb-1.5 block text-xs font-medium text-slate-600", children: label }) : null,
    (0, import_jsx_runtime.jsxs)("div", { className: "relative", children: [
      (0, import_jsx_runtime.jsx)("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", children: "⌕" }),
      (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "text",
          autoComplete: "off",
          name,
          value,
          disabled,
          onClick,
          onChange,
          onKeyDown,
          onFocus,
          placeholder,
          className: `input-base block w-full pl-9 pr-8 ${sizeClass(size)} ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : ""}`
        }
      ),
      (0, import_jsx_runtime.jsx)("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400", children: "⌄" })
    ] })
  ] });
}
function SelectInput({
  label,
  name,
  placeholder,
  options,
  value,
  onChange,
  size,
  disabled
}) {
  return (0, import_jsx_runtime.jsxs)("div", { className: "w-full", children: [
    label ? (0, import_jsx_runtime.jsx)("label", { className: "mb-1.5 block text-xs font-medium text-slate-600", children: label }) : null,
    (0, import_jsx_runtime.jsxs)("div", { className: "relative", children: [
      (0, import_jsx_runtime.jsxs)(
        "select",
        {
          name,
          value,
          disabled,
          onChange,
          className: `input-base block w-full appearance-none px-3.5 ${sizeClass(size)} ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : ""}`,
          children: [
            (0, import_jsx_runtime.jsx)("option", { value: "", disabled: true, children: placeholder || "Seleccionar..." }),
            options.map((option) => (0, import_jsx_runtime.jsx)("option", { value: String(option.id), children: option.name }, String(option.id)))
          ]
        }
      ),
      (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400", children: "⌄" })
    ] })
  ] });
}
function ResponsiveActionContainer({ actions, size }) {
  const [open, setOpen] = (0, import_react.useState)(false);
  return (0, import_jsx_runtime.jsxs)("div", { className: "fixed bottom-6 right-6 z-50", children: [
    open ? (0, import_jsx_runtime.jsx)("div", { className: "mb-3 flex flex-col items-end gap-2", children: actions.map((action) => (0, import_jsx_runtime.jsx)(ActionButtonView, { action, size }, `floating-action-${action.label}`)) }) : null,
    (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        onClick: () => setOpen((current) => !current),
        className: "flex h-12 w-12 items-center justify-center rounded-full bg-custom-btn text-2xl text-white shadow-lg transition-all duration-200 hover:bg-custom-btn/85 active:scale-95",
        "aria-label": "Acciones",
        children: "+"
      }
    )
  ] });
}
function FilterBar({
  filters,
  actions = [],
  children,
  className = "",
  inputSize = "sm"
}) {
  const [suggestionsVisible, setSuggestionsVisible] = (0, import_react.useState)({});
  const [highlightedIndex, setHighlightedIndex] = (0, import_react.useState)({});
  const refs = (0, import_react.useRef)({});
  const hideSuggestions = (0, import_react.useCallback)((name) => {
    setSuggestionsVisible((prev) => ({ ...prev, [name]: false }));
  }, []);
  const showSuggestions = (0, import_react.useCallback)((name) => {
    setSuggestionsVisible((prev) => ({ ...prev, [name]: true }));
  }, []);
  (0, import_react.useEffect)(() => {
    const handleClick = (event) => {
      Object.entries(refs.current).forEach(([name, element]) => {
        if (suggestionsVisible[name] && element && !element.contains(event.target)) {
          hideSuggestions(name);
        }
      });
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        Object.keys(suggestionsVisible).forEach((name) => hideSuggestions(name));
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [hideSuggestions, suggestionsVisible]);
  const handleSuggestionClick = (0, import_react.useCallback)(
    (name, option, onChange, setData) => {
      setData(option);
      onChange(option.name);
      hideSuggestions(name);
    },
    [hideSuggestions]
  );
  const createHandleKeyDown = (0, import_react.useCallback)(
    (name, options, onChange, setData) => (event) => {
      const currentIndex = highlightedIndex[name] || 0;
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nextIndex = Math.min(options.length - 1, currentIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (options.length > 0) {
          handleSuggestionClick(name, options[currentIndex], onChange, setData);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideSuggestions(name);
      }
      setHighlightedIndex((prev) => ({ ...prev, [name]: nextIndex }));
    },
    [handleSuggestionClick, hideSuggestions, highlightedIndex]
  );
  return (0, import_jsx_runtime.jsx)("div", { className: `w-full ${className}`.trim(), children: (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-start justify-between gap-3 px-1 py-2 sm:flex-row sm:items-end sm:gap-4", children: [
    (0, import_jsx_runtime.jsxs)("div", { className: "flex w-full flex-col gap-4 sm:flex-1 sm:flex-row", children: [
      filters.map((filter) => (0, import_jsx_runtime.jsx)("div", { className: "w-full flex-1 sm:w-auto sm:max-w-60", children: filter.type === "select" ? (0, import_jsx_runtime.jsx)(
        SelectInput,
        {
          label: filter.label,
          name: filter.name,
          placeholder: filter.placeholder || `Seleccione ${filter.label.toLowerCase()}`,
          value: filter.value !== void 0 && filter.value !== null ? String(filter.value) : "",
          onChange: (event) => {
            var _a;
            const selectedId = event.target.value;
            const selectedItem = (_a = filter.options) == null ? void 0 : _a.find((option) => String(option.id) === selectedId);
            filter.setData(selectedItem);
            filter.onChange((selectedItem == null ? void 0 : selectedItem.name) ?? "");
          },
          options: filter.options || [],
          disabled: filter.disabled,
          size: inputSize
        }
      ) : (0, import_jsx_runtime.jsxs)(
        "div",
        {
          ref: (element) => {
            refs.current[filter.name] = element;
          },
          className: "relative",
          children: [
            (0, import_jsx_runtime.jsx)(
              SearchInput,
              {
                label: filter.label,
                name: filter.name,
                placeholder: filter.placeholder || `Buscar ${filter.label.toLowerCase()}`,
                value: String(filter.value ?? ""),
                size: inputSize,
                onClick: () => showSuggestions(filter.name),
                onChange: (event) => filter.onChange(event.target.value),
                onFocus: () => showSuggestions(filter.name),
                onKeyDown: createHandleKeyDown(
                  filter.name,
                  filter.options || [],
                  filter.onChange,
                  filter.setData
                ),
                disabled: filter.disabled
              }
            ),
            suggestionsVisible[filter.name] && filter.options ? (0, import_jsx_runtime.jsx)("div", { className: "flex items-center justify-between", children: (0, import_jsx_runtime.jsxs)("ul", { className: "absolute top-full z-10 max-h-[200px] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg", children: [
              (0, import_jsx_runtime.jsx)(
                "li",
                {
                  className: "cursor-pointer px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50",
                  onClick: () => {
                    filter.setData({ id: 0, name: "Todos los registros" });
                    filter.onChange("Todos los registros");
                    hideSuggestions(filter.name);
                  },
                  children: "Todos los registros"
                }
              ),
              filter.options.map((option, index) => (0, import_jsx_runtime.jsx)(
                "li",
                {
                  onClick: () => handleSuggestionClick(filter.name, option, filter.onChange, filter.setData),
                  className: `cursor-pointer px-3.5 py-2.5 text-sm transition-colors duration-150 ${highlightedIndex[filter.name] === index ? "bg-primary-50 font-medium text-primary-700" : "hover:bg-slate-50"}`,
                  children: option.name
                },
                String(option.id)
              ))
            ] }) }) : null
          ]
        }
      ) }, `filter-${filter.name}`)),
      children ? (0, import_jsx_runtime.jsx)("div", { className: "mx-2", children }) : null
    ] }),
    actions.length > 0 ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      (0, import_jsx_runtime.jsx)("div", { className: "hidden items-center justify-end gap-2 sm:flex", children: actions.map((action) => (0, import_jsx_runtime.jsx)(ActionButtonView, { action, size: inputSize }, `action-${action.label}`)) }),
      (0, import_jsx_runtime.jsx)("div", { className: "sm:hidden", children: (0, import_jsx_runtime.jsx)(ResponsiveActionContainer, { actions, size: inputSize }) })
    ] }) : null
  ] }) });
}
export {
  FilterBar
};
//# sourceMappingURL=@devpablocristo_modules-ui-filters.js.map
