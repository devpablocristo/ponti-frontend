import { useCallback, useMemo } from "react";
import { ArrowRight, Bot } from "lucide-react";
import { Link } from "react-router-dom";

import { listPontiDecisionCards } from "@/api/aiClient";
import { useAiFeature, useAiFeatures } from "@/hooks/useAiFeatures";
import { usePollingQuery } from "@/hooks/usePollingQuery";
import { useSelection } from "@/pages/login/context/useSelection";

const BUCKET_LABELS: Record<string, string> = {
  urgent: "Urgente",
  important: "Importante",
  opportunity: "Oportunidad",
  follow_up: "Seguimiento",
};

const severityClass = (severity: string): string => {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "opportunity":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

/** Resumen de decisiones IA para el dashboard admin (flag dashboard_widget). */
export const DecisionSummaryWidget = () => {
  const enabled = useAiFeature("dashboard_widget");
  const { config } = useAiFeatures();
  const { projectId } = useSelection();
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);

  // Memoizada: el cambio de proyecto cambia la identidad de fn y fuerza un refetch inmediato.
  const fetchCards = useCallback(() => {
    if (!headers) return Promise.reject(new Error("Proyecto no seleccionado"));
    return listPontiDecisionCards(headers, { limit: 3 });
  }, [headers]);

  const { data, error, loading } = usePollingQuery(fetchCards, {
    intervalMs: config.badge_poll_ms,
    enabled: enabled && Boolean(headers),
  });

  if (!enabled || !projectId) return null;

  const cards = data?.items ?? [];

  return (
    <section className="my-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Bot className="h-4 w-4 text-primary-700" aria-hidden />
          Decisiones IA
        </h2>
        <Link
          to="/admin/ai/operations"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
        >
          Ver agente operativo
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {error && cards.length === 0 ? (
        <p className="text-sm text-gray-500">No se pudieron cargar las decisiones IA.</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-gray-500">
          {loading ? "Cargando decisiones..." : "No hay decisiones IA vigentes."}
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.id}
              to="/admin/ai/operations"
              className="rounded-lg border border-gray-200 bg-white p-3 transition hover:border-primary-300"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${severityClass(card.severity)}`}>
                  {card.severity}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  {BUCKET_LABELS[card.bucket] ?? card.bucket}
                </span>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{card.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default DecisionSummaryWidget;
