import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  InsightCardsList,
  InsightSummaryCards,
  type InsightListItem,
} from "@devpablocristo/modules-ai-console";
import Button from "../../../components/Button/Button";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { computeInsights, getInsights, getInsightsSummary } from "@/api/aiClient";
import type { InsightItem, InsightsSummary } from "@/types/ai";

const AIInsights = () => {
  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const [entityType, setEntityType] = useState("project");
  const [entityId, setEntityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  const headers = projectId ? { projectId: String(projectId) } : null;
  const location = useLocation();
  const resolvedEntityType = entityType || "project";
  const resolvedEntityId =
    entityId || (projectId ? String(projectId) : "");

  const formatImpact = (item: InsightItem): string | null => {
    if (item.impact_min == null || item.impact_max == null) {
      return null;
    }

    return `Impacto: ${item.impact_min.toFixed(2)}–${item.impact_max.toFixed(2)}${item.impact_unit ?? ""}`;
  };

  const buildInsightCardItem = (item: InsightItem): InsightListItem => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    badge: `${item.type} · ${item.severity}`,
    impact: formatImpact(item),
    ctaLabel: getCtaLabel(item),
    metadata: [
      `Confianza: ${item.confidence ?? "n/a"}`,
      `Ventana: ${getWindowLabel(item)}`,
      ...(item.cooldown_until ? [`Cooldown: ${item.cooldown_until}`] : []),
      ...(item.rules_version ? [`Regla: ${item.rules_version}`] : []),
    ],
    action: (
      <Link
        className="text-sm text-blue-600 hover:underline"
        to={`/admin/ai-copilot?insight_id=${encodeURIComponent(
          item.id
        )}&mode=explain&title=${encodeURIComponent(item.title)}`}
      >
        Abrir Copilot
      </Link>
    ),
  });

  const getWindowLabel = (item: InsightItem): string => {
    const raw = item.evidence?.["window"];
    return typeof raw === "string" ? raw : "all";
  };

  const getCtaLabel = (item: InsightItem): string | null => {
    const raw = item.action?.["cta_label"];
    return typeof raw === "string" ? raw : null;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const presetType = params.get("entity_type");
    const presetId = params.get("entity_id");
    if (presetType) {
      setEntityType(presetType);
    }
    if (presetId) {
      setEntityId(presetId);
    }
  }, [location.search]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const handleSummary = async () => {
    setLoading(true);
    clearFeedback();
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      const res = await getInsightsSummary(headers);
      setSummary(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompute = async () => {
    setLoading(true);
    clearFeedback();
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      const result = await computeInsights(headers);
      setSuccess(
        `Insights: ${result.computed} evaluados, ${result.insights_created} creados. Req ${result.request_id}.`
      );
      await handleSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInsights = async () => {
    setLoading(true);
    clearFeedback();
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      if (!resolvedEntityId) {
        throw new Error("Entity ID obligatorio");
      }
      const res = await getInsights(headers, resolvedEntityType, resolvedEntityId);
      setInsights(res.insights);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      <FilterBar filters={filters} />
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleSummary}
        >
          {loading ? "Cargando..." : "Refrescar badge"}
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleCompute}
        >
          Recalcular insights
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {success && (
          <span className="text-sm text-green-600">{success}</span>
        )}
      </div>

      <InsightSummaryCards
        cards={[
          { label: "Nuevos", value: summary?.new_count_total ?? "-" },
          {
            label: "Alta severidad",
            value: summary?.new_count_high_severity ?? "-",
          },
          { label: "Top Insights", value: summary?.top_insights?.length ?? "-" },
        ]}
      />

      <InsightCardsList
        title="Top Insights"
        items={(summary?.top_insights ?? []).map((item) => buildInsightCardItem(item))}
        emptyMessage="Sin insights activos."
      />

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleFetchInsights}
        >
          Ver insights
        </Button>
      </div>

      <InsightCardsList
        title="Listado de Insights"
        items={insights.map((item) => buildInsightCardItem(item))}
        emptyMessage="Sin resultados."
        collapsedCount={3}
        expanded={showAll}
        onToggleExpanded={() => setShowAll((prev) => !prev)}
      />
    </div>
  );
};

export default AIInsights;
