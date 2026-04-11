import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { getInsightsSummary } from "@/api/aiClient";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type { NotificationChatHandoff } from "@/lib/notificationChatHandoff";
import type { components } from "@/generated/ponti-ai.openapi";

type InsightItem = components["schemas"]["InsightItem"];

function severityColor(severity: number): string {
  if (severity >= 80) return "#EF4444";
  if (severity >= 50) return "#F59E0B";
  return "#547792";
}

function severityLabel(severity: number): string {
  if (severity >= 80) return "Alta";
  if (severity >= 50) return "Media";
  return "Baja";
}

function statusLabel(status: string): string {
  switch (status) {
    case "new": return "Nuevo";
    case "acknowledged": return "Visto";
    case "snoozed": return "Pospuesto";
    case "resolved": return "Resuelto";
    default: return status;
  }
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const headers = useMemo(
    () => (projectId ? { projectId: String(projectId) } : null),
    [projectId]
  );

  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [totalNew, setTotalNew] = useState(0);
  const [highSeverity, setHighSeverity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInsights = useCallback(async () => {
    if (!headers) return;
    setLoading(true);
    setError("");
    try {
      const summary = await getInsightsSummary(headers);
      setInsights(summary.top_insights ?? []);
      setTotalNew(summary.new_count_total ?? 0);
      setHighSeverity(summary.new_count_high_severity ?? 0);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <FilterBar filters={filters} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notificaciones IA</h1>
          <p className="text-sm text-gray-600">
            Insights generados automáticamente sobre tu proyecto.{" "}
            {totalNew > 0 && (
              <span className="font-medium">
                {totalNew} nuevo{totalNew !== 1 ? "s" : ""}
                {highSeverity > 0 && (
                  <span className="text-red-600"> ({highSeverity} de alta severidad)</span>
                )}
              </span>
            )}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void fetchInsights()} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {!headers && (
        <p className="text-sm text-amber-700">Selecciona un proyecto para ver notificaciones.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && insights.length === 0 && headers && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No hay notificaciones por ahora.</p>
          <p className="mt-1 text-sm text-gray-400">
            Los insights se generan automáticamente cuando hay cambios en el proyecto.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-lg border bg-white p-4 transition-colors hover:border-gray-300"
            style={{
              borderLeftWidth: "4px",
              borderLeftColor: severityColor(insight.severity),
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: severityColor(insight.severity) }}
                  >
                    {severityLabel(insight.severity)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {insight.entity_type} &middot; {insight.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {timeAgo(insight.computed_at)}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-900">{insight.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{insight.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-gray-400">{statusLabel(insight.status)}</span>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => {
                    const handoff: NotificationChatHandoff = {
                      notificationId: insight.id,
                      insightId: insight.id,
                      title: insight.title,
                      summary: insight.summary,
                      entityType: insight.entity_type,
                      entityId: insight.entity_id,
                      severity: insight.severity,
                      source: "in_app_notification",
                      suggestedMessage: `Explicame este insight: ${insight.title}`,
                    };
                    sessionStorage.setItem(NOTIFICATION_CHAT_HANDOFF_KEY, JSON.stringify(handoff));
                    navigate("/admin/ai-assistant");
                  }}
                >
                  Explicar en chat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
