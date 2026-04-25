import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import {
  listInsights,
  markInsightRead,
  markInsightUnread,
  reopenInsight,
  resolveInsight,
  type InsightItem,
} from "@/api/insightsClient";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type { NotificationChatHandoff } from "@/lib/notificationChatHandoff";

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "#EF4444";
    case "warning":
    case "medium":
      return "#F59E0B";
    case "info":
    case "low":
      return "#547792";
    default:
      return "#9CA3AF";
  }
}

function severityLabel(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "Alta";
    case "warning":
    case "medium":
      return "Media";
    case "info":
    case "low":
      return "Baja";
    default:
      return severity;
  }
}

function severityWeight(severity: string): number {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return 3;
    case "warning":
    case "medium":
      return 2;
    case "info":
    case "low":
      return 1;
    default:
      return 0;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
    case "pending":
      return "Nueva";
    case "notified":
      return "Activa";
    case "resolved":
      return "Resuelta";
    default:
      return status;
  }
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
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
  const projectIdStr = useMemo(
    () => (projectId ? String(projectId) : undefined),
    [projectId],
  );

  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [includeResolved, setIncludeResolved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const summary = await listInsights(projectIdStr, { includeResolved });
      setInsights(summary.items ?? []);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [projectIdStr, includeResolved]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const isResolved = (i: InsightItem) => i.status === "resolved";
  const isUnread = (i: InsightItem) => !i.read_at && !isResolved(i);

  const unreadCount = useMemo(() => insights.filter(isUnread).length, [insights]);
  const highSeverityCount = useMemo(
    () => insights.filter((i) => isUnread(i) && severityWeight(i.severity) >= 3).length,
    [insights],
  );

  const optimistic = (id: string, patch: Partial<InsightItem>) => {
    setInsights((curr) => curr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await markInsightRead(id, projectIdStr);
      optimistic(id, { read_at: new Date().toISOString() });
    } catch {
      setError("No se pudo marcar como leida.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkUnread = async (id: string) => {
    setBusyId(id);
    try {
      await markInsightUnread(id, projectIdStr);
      optimistic(id, { read_at: undefined });
    } catch {
      setError("No se pudo desmarcar.");
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (id: string) => {
    setBusyId(id);
    try {
      await resolveInsight(id, projectIdStr);
      if (includeResolved) {
        optimistic(id, { status: "resolved", resolved_at: new Date().toISOString() });
      } else {
        setInsights((curr) => curr.filter((it) => it.id !== id));
      }
    } catch {
      setError("No se pudo resolver.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = async (id: string) => {
    setBusyId(id);
    try {
      await reopenInsight(id, projectIdStr);
      optimistic(id, { status: "notified", resolved_at: undefined, read_at: undefined });
    } catch {
      setError("No se pudo reabrir.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExplain = (insight: InsightItem) => {
    if (!insight.read_at) {
      void markInsightRead(insight.id, projectIdStr).then(() =>
        optimistic(insight.id, { read_at: new Date().toISOString() }),
      ).catch(() => {});
    }
    const evidenceLines = insight.evidence
      ? Object.entries(insight.evidence)
          .filter(([k]) => !k.startsWith("review_"))
          .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
          .join("\n")
      : "";
    const suggested = [
      `Tengo este insight nuevo y necesito que me ayudes a entenderlo:`,
      ``,
      `**${insight.title}** (${insight.event_type})`,
      insight.body,
      evidenceLines ? `\nDatos:\n${evidenceLines}` : "",
      `\n¿Qué pudo causarlo y qué deberíamos revisar?`,
    ]
      .filter(Boolean)
      .join("\n");
    const handoff: NotificationChatHandoff = {
      title: insight.title,
      body: insight.body,
      entityType: insight.entity_type,
      entityId: insight.entity_id,
      source: "in_app_notification",
      suggestedMessage: suggested,
    };
    sessionStorage.setItem(NOTIFICATION_CHAT_HANDOFF_KEY, JSON.stringify(handoff));
    navigate("/admin/ai-assistant");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <FilterBar filters={filters} />

      <div className="flex items-center justify-between">
        <div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">
                {unreadCount} sin leer
                {highSeverityCount > 0 && (
                  <span className="text-red-600"> ({highSeverityCount} de alta severidad)</span>
                )}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => setIncludeResolved(e.target.checked)}
            />
            Mostrar resueltas
          </label>
          <Button size="sm" variant="secondary" onClick={() => void fetchInsights()} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && insights.length === 0 && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No hay notificaciones por ahora.</p>
          <p className="mt-1 text-sm text-gray-400">
            Los insights se generan automáticamente cuando hay cambios en el proyecto.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {insights.map((insight) => {
          const unread = isUnread(insight);
          const resolved = isResolved(insight);
          return (
            <div
              key={insight.id}
              className={`rounded-lg border p-4 transition-colors ${
                resolved
                  ? "bg-gray-50 border-gray-200 opacity-70"
                  : unread
                    ? "bg-blue-50/40 border-gray-200 hover:border-gray-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
              }`}
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: resolved ? "#9CA3AF" : severityColor(insight.severity),
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {unread && (
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="No leida" />
                    )}
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: severityColor(insight.severity) }}
                    >
                      {severityLabel(insight.severity)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {insight.entity_type} &middot; {insight.event_type}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(insight.last_seen_at)}</span>
                    {insight.occurrence_count > 1 && (
                      <span className="text-xs text-gray-500">×{insight.occurrence_count}</span>
                    )}
                  </div>
                  <h3 className={`text-sm ${unread ? "font-semibold" : "font-medium"} text-gray-900`}>
                    {insight.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{insight.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400">{statusLabel(insight.status)}</span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    onClick={() => handleExplain(insight)}
                    disabled={busyId === insight.id}
                  >
                    Explicar en chat
                  </button>
                  {!resolved && (
                    <>
                      {unread ? (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:underline disabled:opacity-50"
                          onClick={() => void handleMarkRead(insight.id)}
                          disabled={busyId === insight.id}
                        >
                          Marcar leida
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:underline disabled:opacity-50"
                          onClick={() => void handleMarkUnread(insight.id)}
                          disabled={busyId === insight.id}
                        >
                          Marcar no leida
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
                        onClick={() => void handleResolve(insight.id)}
                        disabled={busyId === insight.id}
                      >
                        Resolver
                      </button>
                    </>
                  )}
                  {resolved && (
                    <button
                      type="button"
                      className="text-xs text-amber-700 hover:underline disabled:opacity-50"
                      onClick={() => void handleReopen(insight.id)}
                      disabled={busyId === insight.id}
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
