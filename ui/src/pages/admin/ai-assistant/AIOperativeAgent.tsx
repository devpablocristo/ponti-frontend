import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Clock3,
  FileSearch,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useNavigate } from "react-router-dom";

import {
  createPontiDecisionRun,
  executePontiDecisionCardAction,
  listPontiDecisionCards,
  listPontiDecisionRuns,
  patchPontiDecisionCard,
} from "@/api/aiClient";
import { useWorkspaceFilters } from "@/hooks/useWorkspaceFilters";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type {
  PontiDecisionBucket,
  PontiDecisionCard,
  PontiDecisionRun,
  PontiDecisionStatus,
  PontiRouteHint,
  PontiWorkspaceContext,
} from "@/types/aiChat";

type DecisionViewConfig = {
  title: string;
  routeHint?: PontiRouteHint;
  domain?: string;
  activity?: boolean;
};

const BUCKETS: Array<{ key: PontiDecisionBucket; label: string }> = [
  { key: "urgent", label: "Urgente" },
  { key: "important", label: "Importante" },
  { key: "opportunity", label: "Oportunidad" },
  { key: "follow_up", label: "Seguimiento" },
];

const MODULE_CONFIGS = {
  operations: { title: "Agente Operativo" },
  dashboard: { title: "IA Dashboard", routeHint: "dashboard" },
  stock: { title: "IA Stock", routeHint: "stock", domain: "stock" },
  workOrders: { title: "IA Órdenes y Labores", routeHint: "labors", domain: "workorders" },
  lots: { title: "IA Lotes", routeHint: "lots", domain: "lots" },
  supplies: { title: "IA Insumos", routeHint: "supplies", domain: "supplies" },
  reports: { title: "IA Informes", routeHint: "reports", domain: "reports" },
  insights: { title: "IA Insights", domain: "insights" },
  activity: { title: "Actividad IA", activity: true },
} satisfies Record<string, DecisionViewConfig>;

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

const statusClass = (status: string): string => {
  switch (status) {
    case "accepted":
    case "drafted":
      return "bg-primary-50 text-primary-700";
    case "resolved":
      return "bg-emerald-50 text-emerald-700";
    case "dismissed":
      return "bg-gray-100 text-gray-600";
    case "snoozed":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-white text-gray-600";
  }
};

const toolName = (tool: unknown): string => {
  if (typeof tool === "string") return tool;
  if (typeof tool !== "object" || tool === null || Array.isArray(tool)) return "tool";
  const record = tool as Record<string, unknown>;
  return String(record.name ?? record.tool ?? record.capability_id ?? "tool");
};

const compactDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const bucketCards = (cards: PontiDecisionCard[], bucket: PontiDecisionBucket): PontiDecisionCard[] =>
  cards.filter((card) => card.bucket === bucket);

const filterCardsForConfig = (cards: PontiDecisionCard[], config: DecisionViewConfig): PontiDecisionCard[] =>
  cards.filter((card) => {
    if (config.domain && card.domain !== config.domain) return false;
    if (config.domain && config.routeHint && card.route_hint !== config.routeHint) return false;
    return true;
  });

const buildWorkspace = (
  selectedCustomer: { id: number; name: string } | undefined,
  selectedProject: { id: number; name: string } | undefined,
  projectId: number | null,
  selectedCampaignId: number | undefined,
  campaigns: Array<{ id: number; name: string }> | undefined,
  selectedField: { id: number; name: string } | undefined
): PontiWorkspaceContext => {
  const campaign = campaigns?.find((c) => c.id === selectedCampaignId);
  return {
    customer_id: selectedCustomer?.id ?? null,
    customer_name: selectedCustomer?.name ?? null,
    project_id: projectId ?? null,
    project_name: selectedProject?.name ?? null,
    campaign_id: selectedCampaignId ?? null,
    campaign_name: campaign?.name ?? null,
    field_id: selectedField?.id ?? null,
    field_name: selectedField?.name ?? null,
  };
};

const workspaceReady = (workspace: PontiWorkspaceContext): boolean =>
  Boolean(workspace.customer_id && workspace.project_id && workspace.campaign_id);

const DecisionCard = ({
  card,
  active,
  onSelect,
}: {
  card: PontiDecisionCard;
  active: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-primary-300 ${
      active ? "border-primary-400" : "border-gray-200"
    }`}
    onClick={onSelect}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${severityClass(card.severity)}`}>
        {card.severity}
      </span>
      <span className={`rounded px-2 py-0.5 text-[11px] ${statusClass(card.status)}`}>{card.status}</span>
    </div>
    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{card.title}</h3>
    <p className="mt-1 line-clamp-3 text-xs text-gray-600">{card.summary}</p>
    {card.impact_label && <p className="mt-2 text-xs font-medium text-gray-800">{card.impact_label}</p>}
    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
      <span>{card.source || card.domain}</span>
      <span>{compactDate(card.last_seen_at)}</span>
    </div>
  </button>
);

const EvidenceList = ({ card }: { card: PontiDecisionCard }) => {
  const items = Array.isArray(card.evidence?.items) ? card.evidence?.items : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(card.tools ?? []).map((tool, index) => (
          <span key={`${index}-${toolName(tool)}`} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {toolName(tool)}
          </span>
        ))}
      </div>
      {items.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
          {items.slice(0, 4).map((item, index) => (
            <pre key={index} className="mb-2 max-h-24 overflow-auto whitespace-pre-wrap font-mono last:mb-0">
              {JSON.stringify(item, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
};

const DecisionDetail = ({
  card,
  actionLoading,
  actionMessage,
  onExplain,
  onAction,
  onStatus,
}: {
  card: PontiDecisionCard | null;
  actionLoading: boolean;
  actionMessage: string;
  onExplain: (card: PontiDecisionCard) => void;
  onAction: (card: PontiDecisionCard) => void;
  onStatus: (card: PontiDecisionCard, status: PontiDecisionStatus) => void;
}) => {
  if (!card) {
    return (
      <aside className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 lg:w-96">
        Seleccioná una decisión.
      </aside>
    );
  }

  const actionID = card.action?.id;
  const missingInputs = card.action?.missing_inputs ?? [];
  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-4 lg:w-96">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{card.domain}</p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">{card.title}</h2>
        </div>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${severityClass(card.severity)}`}>
          {card.severity}
        </span>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <p>{card.summary}</p>
        <div className="rounded-md bg-primary-50 p-3 text-primary-900">
          <p className="text-xs font-semibold uppercase text-primary-700">Recomendación</p>
          <p className="mt-1">{card.recommendation}</p>
        </div>
        {card.impact_label && <p className="text-sm font-medium text-gray-900">{card.impact_label}</p>}

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Evidencia
          </p>
          <EvidenceList card={card} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {card.axis_run_id && <span className="rounded bg-gray-100 px-2 py-1">run {card.axis_run_id.slice(0, 8)}</span>}
          {card.axis_task_id && <span className="rounded bg-gray-100 px-2 py-1">task {card.axis_task_id.slice(0, 8)}</span>}
          <span className="rounded bg-gray-100 px-2 py-1">occ {card.occurrence_count}</span>
          <span className="rounded bg-gray-100 px-2 py-1">{compactDate(card.last_seen_at)}</span>
        </div>

        {missingInputs.length > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Faltan datos: {missingInputs.join(", ")}
          </p>
        )}

        {actionMessage && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{actionMessage}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onExplain(card)}
          >
            <FileSearch className="h-3.5 w-3.5" aria-hidden />
            Explicar
          </button>
          {actionID && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-60"
              disabled={actionLoading}
              onClick={() => onAction(card)}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {card.action?.requires_approval ? "Pedir aprobación" : card.action?.label || "Ejecutar"}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onStatus(card, "snoozed")}
          >
            <Pause className="h-3.5 w-3.5" aria-hidden />
            Posponer
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onStatus(card, "resolved")}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Resolver
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onStatus(card, "dismissed")}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Descartar
          </button>
        </div>
      </div>
    </aside>
  );
};

const AIDecisionCenter = ({ config }: { config: DecisionViewConfig }) => {
  const navigate = useNavigate();
  const { filters, projectId, selectedCustomer, selectedProject, selectedCampaignId, selectedField, campaigns } =
    useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const workspace = useMemo(
    () => buildWorkspace(selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField),
    [selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField]
  );
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);
  const ready = workspaceReady(workspace);

  const [cards, setCards] = useState<PontiDecisionCard[]>([]);
  const [runs, setRuns] = useState<PontiDecisionRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const selectedCard = cards.find((card) => card.id === selectedId) ?? cards[0] ?? null;

  const refresh = useCallback(async () => {
    if (!headers) return;
    setLoading(true);
    setError("");
    try {
      const [cardRes, runRes] = await Promise.all([
        listPontiDecisionCards(headers, {
          route_hint: config.routeHint,
          domain: config.domain,
          include_resolved: config.activity,
          limit: config.activity ? 200 : 100,
        }),
        listPontiDecisionRuns(headers, 20),
      ]);
      setCards(cardRes.items);
      setRuns(runRes.items);
      setSelectedId((current) => current ?? cardRes.items[0]?.id ?? null);
    } catch (err) {
      setCards([]);
      setRuns([]);
      setError(err instanceof Error ? err.message : "No se pudo cargar IA");
    } finally {
      setLoading(false);
    }
  }, [headers, config.routeHint, config.domain, config.activity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAnalysis = async () => {
    if (!headers || !ready) return;
    setRunning(true);
    setError("");
    setActionMessage("");
    try {
      const res = await createPontiDecisionRun(
        {
          workspace,
          route_hint: config.routeHint,
        },
        headers
      );
      const nextCards = filterCardsForConfig(res.cards, config);
      setCards(nextCards);
      setRuns((prev) => [res.run, ...prev.filter((run) => run.id !== res.run.id)].slice(0, 20));
      setSelectedId(nextCards[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar");
    } finally {
      setRunning(false);
    }
  };

  const updateCard = (next: PontiDecisionCard) => {
    setCards((prev) => prev.map((card) => (card.id === next.id ? next : card)));
    setSelectedId(next.id);
  };

  const handleStatus = async (card: PontiDecisionCard, status: PontiDecisionStatus) => {
    if (!headers) return;
    const payload =
      status === "snoozed"
        ? { status, snooze_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
        : { status };
    try {
      const next = await patchPontiDecisionCard(card.id, payload, headers);
      updateCard(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la decisión");
    }
  };

  const handleAction = async (card: PontiDecisionCard) => {
    if (!headers || !card.action?.id) return;
    setActionMessage("");
    try {
      const res = await executePontiDecisionCardAction(card.id, card.action.id, headers);
      updateCard(res.card);
      setActionMessage(
        res.approval_required
          ? "Acción preparada para aprobación Nexus. Axis debe ejecutar la capability aprobada."
          : "Acción preparada."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo preparar la acción");
    }
  };

  const explainInChat = (card: PontiDecisionCard) => {
    sessionStorage.setItem(
      NOTIFICATION_CHAT_HANDOFF_KEY,
      JSON.stringify({
        title: card.title,
        body: card.summary,
        entityType: "ai_decision_card",
        entityId: card.id,
        source: "in_app_notification",
        suggestedMessage: `Explicame esta decisión operativa con evidencia y próximos pasos: ${card.title}. ${card.summary}`,
      })
    );
    navigate("/admin/ai/axis");
  };

  const counts = BUCKETS.map((bucket) => ({
    ...bucket,
    count: bucketCards(cards, bucket.key).length,
  }));

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{config.title}</h1>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            Axis
          </span>
          {runs[0]?.status === "degraded" && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              degradado
            </span>
          )}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-60"
            disabled={!headers || !ready || running}
            onClick={() => void runAnalysis()}
          >
            <Play className="h-4 w-4" aria-hidden />
            {running ? "Analizando..." : "Analizar ahora"}
          </button>
        </div>
        <FilterBar filters={filters} />
      </div>

      {!ready && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Seleccioná cliente, proyecto y campaña.
        </p>
      )}
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-4">
        {counts.map((item) => (
          <div key={item.key} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-medium uppercase text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{item.count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <main className="min-w-0 flex-1">
          {config.activity && (
            <section className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Clock3 className="h-4 w-4" aria-hidden />
                Runs recientes
              </h2>
              <div className="grid gap-2 lg:grid-cols-2">
                {runs.map((run) => (
                  <div key={run.id} className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{run.status}</span>
                      <span>{compactDate(run.created_at)}</span>
                    </div>
                    <p className="mt-1 text-gray-500">
                      {run.cards_total} decisiones · {run.routing_source}
                    </p>
                    {run.degraded_reason && <p className="mt-1 line-clamp-2 text-amber-700">{run.degraded_reason}</p>}
                  </div>
                ))}
                {runs.length === 0 && <p className="text-sm text-gray-500">Sin runs registrados.</p>}
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {BUCKETS.map((bucket) => {
              const items = bucketCards(cards, bucket.key);
              return (
                <section key={bucket.key} className="min-h-64 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">{bucket.label}</h2>
                    <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-500">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((card) => (
                      <DecisionCard
                        key={card.id}
                        card={card}
                        active={selectedCard?.id === card.id}
                        onSelect={() => setSelectedId(card.id)}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500">
                        Sin decisiones.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {!loading && cards.length === 0 && ready && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-gray-400" aria-hidden />
              No hay decisiones vigentes.
            </div>
          )}
        </main>

        <DecisionDetail
          card={selectedCard}
          actionLoading={running}
          actionMessage={actionMessage}
          onExplain={explainInChat}
          onAction={(card) => void handleAction(card)}
          onStatus={(card, status) => void handleStatus(card, status)}
        />
      </div>
    </div>
  );
};

export const AIOperativeAgent = () => <AIDecisionCenter config={MODULE_CONFIGS.operations} />;
export const AIDecisionDashboard = () => <AIDecisionCenter config={MODULE_CONFIGS.dashboard} />;
export const AIDecisionStock = () => <AIDecisionCenter config={MODULE_CONFIGS.stock} />;
export const AIDecisionWorkOrders = () => <AIDecisionCenter config={MODULE_CONFIGS.workOrders} />;
export const AIDecisionLots = () => <AIDecisionCenter config={MODULE_CONFIGS.lots} />;
export const AIDecisionSupplies = () => <AIDecisionCenter config={MODULE_CONFIGS.supplies} />;
export const AIDecisionReports = () => <AIDecisionCenter config={MODULE_CONFIGS.reports} />;
export const AIDecisionInsights = () => <AIDecisionCenter config={MODULE_CONFIGS.insights} />;
export const AIDecisionActivity = () => <AIDecisionCenter config={MODULE_CONFIGS.activity} />;

export default AIOperativeAgent;
