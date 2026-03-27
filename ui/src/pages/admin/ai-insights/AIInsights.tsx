import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import Button from "../../../components/Button/Button";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import {
  computeInsights,
  getInsights,
  getInsightsSummary,
  InsightsSummary,
  InsightItem,
} from "@/api/aiClient";

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
        `Insights: ${result.computed} evaluados, ${result.insights_created} creados.`
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Nuevos</div>
          <div className="text-2xl font-semibold">
            {summary?.new_count_total ?? "-"}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Alta severidad</div>
          <div className="text-2xl font-semibold">
            {summary?.new_count_high_severity ?? "-"}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Top Insights</div>
          <div className="text-2xl font-semibold">
            {summary?.top_insights?.length ?? "-"}
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h3 className="font-semibold mb-2">Top Insights</h3>
        {summary?.top_insights?.length ? (
          <div className="grid grid-cols-1 gap-3">
            {summary.top_insights.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.type} · {item.severity}
                  </div>
                </div>
                <div className="text-sm text-slate-600">{item.summary}</div>
                {item.impact_min !== undefined && item.impact_max !== undefined && (
                  <div className="mt-2 text-xs text-slate-500">
                    Impacto: {item.impact_min?.toFixed(2)}–{item.impact_max?.toFixed(2)}
                    {item.impact_unit ?? ""}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span>Confianza: {item.confidence ?? "n/a"}</span>
                  <span>Ventana: {getWindowLabel(item)}</span>
                </div>
                <div className="mt-2">
                  <Link
                    className="text-sm text-blue-600 hover:underline"
                    to={`/admin/ai-copilot?q=${encodeURIComponent(
                      `Explicame el insight: ${item.title}`
                    )}`}
                  >
                    Preguntar al Copilot
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">Sin insights activos.</div>
        )}
      </div>

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

      <div className="border rounded-md p-4">
        <h3 className="font-semibold mb-2">Listado de Insights</h3>
        {insights.length === 0 ? (
          <div className="text-sm text-slate-500">Sin resultados.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(showAll ? insights : insights.slice(0, 3)).map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.type} · {item.severity}
                  </div>
                </div>
                <div className="text-sm text-slate-600">{item.summary}</div>
                {getCtaLabel(item) && (
                  <div className="mt-2 text-sm text-slate-700">
                    CTA: {getCtaLabel(item)}
                  </div>
                )}
                {item.impact_min !== undefined && item.impact_max !== undefined && (
                  <div className="mt-2 text-xs text-slate-500">
                    Impacto: {item.impact_min?.toFixed(2)}–{item.impact_max?.toFixed(2)}
                    {item.impact_unit ?? ""}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span>Confianza: {item.confidence ?? "n/a"}</span>
                  <span>Cooldown: {item.cooldown_until ?? "n/a"}</span>
                  <span>Regla: {item.rules_version ?? "v1"}</span>
                </div>
                <div className="mt-2">
                  <Link
                    className="text-sm text-blue-600 hover:underline"
                    to={`/admin/ai-copilot?q=${encodeURIComponent(
                      `Necesito contexto sobre: ${item.title}`
                    )}`}
                  >
                    Preguntar al Copilot
                  </Link>
                </div>
              </div>
            ))}
            {insights.length > 3 && (
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "Mostrar menos" : "Mostrar todos"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
