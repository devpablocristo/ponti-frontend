import {
  require_jsx_runtime
} from "./chunk-NWKZXVHX.js";
import "./chunk-YLDSBLSF.js";
import {
  __toESM
} from "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/modules-ai-console/src/CopilotResponsePanel.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function JsonSection({ title, value }) {
  return (0, import_jsx_runtime.jsxs)("div", { className: "border rounded-md p-4", children: [
    (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: title }),
    (0, import_jsx_runtime.jsx)("pre", { className: "text-xs text-slate-700 whitespace-pre-wrap", children: JSON.stringify(value, null, 2) })
  ] });
}
function CopilotResponsePanel({
  answer,
  data,
  sources,
  warnings,
  relatedInsightsCount,
  relatedInsights,
  relatedInsightsTitle = "Insights Relacionados",
  relatedInsightsAction,
  emptyRelatedInsightsMessage = "No hay insights activos.",
  renderRelatedInsight
}) {
  return (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 gap-4", children: [
    (0, import_jsx_runtime.jsxs)("div", { className: "border rounded-md p-4", children: [
      (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: "Respuesta" }),
      (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-slate-700", children: answer })
    ] }),
    (0, import_jsx_runtime.jsx)(JsonSection, { title: "Datos", value: data }),
    (0, import_jsx_runtime.jsx)(JsonSection, { title: "Fuentes", value: sources }),
    (0, import_jsx_runtime.jsx)(JsonSection, { title: "Advertencias", value: warnings }),
    (0, import_jsx_runtime.jsxs)("div", { className: "border rounded-md p-4", children: [
      (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: relatedInsightsTitle }),
        relatedInsightsAction
      ] }),
      (0, import_jsx_runtime.jsxs)("div", { className: "mt-2 text-sm text-slate-700", children: [
        "Relacionados: ",
        relatedInsightsCount
      ] }),
      relatedInsights.length === 0 ? (0, import_jsx_runtime.jsx)("div", { className: "mt-2 text-sm text-slate-500", children: emptyRelatedInsightsMessage }) : (0, import_jsx_runtime.jsx)("div", { className: "mt-3 grid grid-cols-1 gap-2", children: relatedInsights.map(
        (item) => renderRelatedInsight ? renderRelatedInsight(item) : (0, import_jsx_runtime.jsx)(
          "a",
          {
            className: "rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50",
            href: item.href || "#",
            children: item.title
          },
          item.id
        )
      ) })
    ] })
  ] });
}

// node_modules/@devpablocristo/modules-ai-console/src/InsightSummaryCards.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function InsightSummaryCards({ cards }) {
  return (0, import_jsx_runtime2.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: cards.map((card) => (0, import_jsx_runtime2.jsxs)("div", { className: "border rounded-md p-4", children: [
    (0, import_jsx_runtime2.jsx)("div", { className: "text-sm text-slate-500", children: card.label }),
    (0, import_jsx_runtime2.jsx)("div", { className: "text-2xl font-semibold", children: card.value })
  ] }, card.label)) });
}

// node_modules/@devpablocristo/modules-ai-console/src/InsightCardsList.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function InsightCardsList({
  title,
  items,
  emptyMessage,
  collapsedCount,
  expanded = false,
  onToggleExpanded,
  showAllLabel = "Mostrar todos",
  showLessLabel = "Mostrar menos"
}) {
  const visibleItems = collapsedCount && !expanded ? items.slice(0, collapsedCount) : items;
  return (0, import_jsx_runtime3.jsxs)("div", { className: "border rounded-md p-4", children: [
    (0, import_jsx_runtime3.jsx)("h3", { className: "font-semibold mb-2", children: title }),
    items.length === 0 ? (0, import_jsx_runtime3.jsx)("div", { className: "text-sm text-slate-500", children: emptyMessage }) : (0, import_jsx_runtime3.jsxs)("div", { className: "grid grid-cols-1 gap-3", children: [
      visibleItems.map((item) => {
        var _a;
        return (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-md border p-3", children: [
          (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [
            (0, import_jsx_runtime3.jsx)("div", { className: "font-semibold", children: item.title }),
            item.badge ? (0, import_jsx_runtime3.jsx)("div", { className: "text-xs text-slate-500", children: item.badge }) : null
          ] }),
          (0, import_jsx_runtime3.jsx)("div", { className: "text-sm text-slate-600", children: item.summary }),
          item.ctaLabel ? (0, import_jsx_runtime3.jsxs)("div", { className: "mt-2 text-sm text-slate-700", children: [
            "CTA: ",
            item.ctaLabel
          ] }) : null,
          item.impact ? (0, import_jsx_runtime3.jsx)("div", { className: "mt-2 text-xs text-slate-500", children: item.impact }) : null,
          ((_a = item.metadata) == null ? void 0 : _a.length) ? (0, import_jsx_runtime3.jsx)("div", { className: "mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500", children: item.metadata.map((entry) => (0, import_jsx_runtime3.jsx)("span", { children: entry }, entry)) }) : null,
          item.action ? (0, import_jsx_runtime3.jsx)("div", { className: "mt-2", children: item.action }) : null
        ] }, item.id);
      }),
      collapsedCount && items.length > collapsedCount && onToggleExpanded ? (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "text-sm text-blue-600 hover:underline",
          onClick: onToggleExpanded,
          children: expanded ? showLessLabel : showAllLabel
        }
      ) : null
    ] })
  ] });
}
export {
  CopilotResponsePanel,
  InsightCardsList,
  InsightSummaryCards
};
//# sourceMappingURL=@devpablocristo_modules-ai-console.js.map
