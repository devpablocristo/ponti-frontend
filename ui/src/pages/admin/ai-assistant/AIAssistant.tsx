import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import ChatThread from "@/components/ai/ChatThread";
import EvidenceDrawer from "@/components/ai/EvidenceDrawer";
import RoutingSourceChip from "@/components/ai/RoutingSourceChip";
import { useAiChatSession } from "@/hooks/useAiChatSession";
import { useAiFeature } from "@/hooks/useAiFeatures";
import { buildPontiWorkspace } from "@/lib/aiWorkspace";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type { NotificationChatHandoff } from "@/lib/notificationChatHandoff";
import { toastWarning } from "@/lib/toast";
import { nonTextBlocks } from "./aiAssistantEvidence";
import type { PontiConversationMessage, PontiRouteHint } from "@/types/aiChat";

const ROUTE_OPTIONS: { value: PontiRouteHint | ""; label: string }[] = [
  { value: "", label: "Automático (todos los módulos)" },
  { value: "general", label: "Asesor de proyecto" },
  { value: "dashboard", label: "Tablero / insights" },
  { value: "labors", label: "Labores" },
  { value: "supplies", label: "Insumos" },
  { value: "campaigns", label: "Campañas" },
  { value: "lots", label: "Lotes" },
  { value: "stock", label: "Stock" },
  { value: "reports", label: "Informes" },
];

type QuickPrompt = { label: string; route: PontiRouteHint; prompt: string };

type AIAssistantConfig = {
  title: string;
  routeHint?: PontiRouteHint | "";
  lockRouteHint?: boolean;
  quickPrompts: QuickPrompt[];
  emptyText: string;
  activityOnly?: boolean;
  consumeNotificationHandoff?: boolean;
};

const GENERAL_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "Resumen operativo",
    route: "dashboard",
    prompt: "Dame un resumen operativo del proyecto con principales riesgos, avances y próximos focos.",
  },
  {
    label: "Revisar stock",
    route: "stock",
    prompt: "Analizá el stock del proyecto y marcá faltantes, diferencias de campo y riesgos de insumos.",
  },
  {
    label: "Labores recientes",
    route: "labors",
    prompt: "Listá las labores recientes y señalá estados problemáticos o costos llamativos.",
  },
  {
    label: "Informe económico",
    route: "reports",
    prompt: "Resumí los informes económicos de la campaña y explicá el resultado operativo.",
  },
  {
    label: "Insights abiertos",
    route: "dashboard",
    prompt: "Mostrame los insights abiertos, explicá los críticos y proponé borradores de acción si corresponde.",
  },
];

const AI_MODULE_CONFIGS = {
  general: {
    title: "Asistente",
    routeHint: "",
    quickPrompts: GENERAL_QUICK_PROMPTS,
    emptyText: "",
    consumeNotificationHandoff: true,
  },
  dashboard: {
    title: "IA Dashboard",
    routeHint: "dashboard",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Resumen operativo",
        route: "dashboard",
        prompt: "Dame un resumen operativo del proyecto con principales riesgos, avances y próximos focos.",
      },
      {
        label: "Riesgos principales",
        route: "dashboard",
        prompt: "Identificá los riesgos principales del proyecto y priorizalos por impacto operativo.",
      },
      {
        label: "Próximos focos",
        route: "dashboard",
        prompt: "Sugerí próximos focos operativos para esta campaña con evidencia de Ponti.",
      },
      {
        label: "Insights abiertos",
        route: "dashboard",
        prompt: "Mostrame los insights abiertos y explicá cuáles requieren atención primero.",
      },
    ],
    emptyText: "",
  },
  stock: {
    title: "IA Stock",
    routeHint: "stock",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Revisar stock",
        route: "stock",
        prompt: "Analizá el stock del proyecto y marcá faltantes, diferencias de campo y riesgos de insumos.",
      },
      {
        label: "Stock negativo",
        route: "stock",
        prompt: "Detectá stock negativo o diferencias grandes y explicá qué debería revisar.",
      },
      {
        label: "Borrador de conteo",
        route: "stock",
        prompt: "Si corresponde, proponé un borrador de conteo de stock sin ejecutar writes finales.",
      },
    ],
    emptyText: "",
  },
  workOrders: {
    title: "IA Órdenes y Labores",
    routeHint: "labors",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Labores recientes",
        route: "labors",
        prompt: "Listá las labores recientes y señalá estados problemáticos o costos llamativos.",
      },
      {
        label: "Estados problemáticos",
        route: "labors",
        prompt: "Marcá órdenes o labores con estados problemáticos, atrasos o costos llamativos.",
      },
      {
        label: "Preparar borrador",
        route: "labors",
        prompt: "Proponé un borrador de orden de trabajo si detectás una acción clara, sin ejecutarla.",
      },
    ],
    emptyText: "",
  },
  lots: {
    title: "IA Lotes",
    routeHint: "lots",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Resumen de lotes",
        route: "lots",
        prompt: "Resumí los lotes del workspace, superficie relevante y alertas por campo o cultivo.",
      },
      {
        label: "Campos críticos",
        route: "lots",
        prompt: "Identificá campos o lotes que requieran atención y explicá por qué.",
      },
      {
        label: "Cruce operativo",
        route: "lots",
        prompt: "Relacioná lotes con labores, stock o informes si hay señales relevantes.",
      },
    ],
    emptyText: "",
  },
  supplies: {
    title: "IA Insumos",
    routeHint: "supplies",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Revisar insumos",
        route: "supplies",
        prompt: "Revisá insumos del proyecto, precios tentativos, disponibilidad y riesgos de costo.",
      },
      {
        label: "Precios tentativos",
        route: "supplies",
        prompt: "Listá insumos con precio tentativo y sugerí qué validar primero.",
      },
      {
        label: "Riesgo de abastecimiento",
        route: "supplies",
        prompt: "Señalá posibles riesgos de abastecimiento o consumo según el workspace.",
      },
    ],
    emptyText: "",
  },
  reports: {
    title: "IA Informes",
    routeHint: "reports",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Informe económico",
        route: "reports",
        prompt: "Resumí los informes económicos de la campaña y explicá el resultado operativo.",
      },
      {
        label: "Resultado operativo",
        route: "reports",
        prompt: "Explicá el resultado operativo de la campaña con evidencia de informes Ponti.",
      },
      {
        label: "Contribución",
        route: "reports",
        prompt: "Resumí aportes/contribución por inversor y marcá desvíos relevantes.",
      },
    ],
    emptyText: "",
  },
  insights: {
    title: "IA Insights",
    routeHint: "dashboard",
    lockRouteHint: true,
    quickPrompts: [
      {
        label: "Insights abiertos",
        route: "dashboard",
        prompt: "Mostrame los insights abiertos, explicá los críticos y proponé borradores de acción si corresponde.",
      },
      {
        label: "Críticos",
        route: "dashboard",
        prompt: "Mostrame insights críticos abiertos, explicalos y priorizá acciones.",
      },
      {
        label: "Proponer resolución",
        route: "dashboard",
        prompt: "Elegí un insight relevante y proponé una resolución reversible sin borrar evidencia.",
      },
    ],
    emptyText: "",
  },
  activity: {
    title: "Actividad IA",
    routeHint: "",
    quickPrompts: [],
    emptyText: "",
    activityOnly: true,
  },
} satisfies Record<string, AIAssistantConfig>;

const routeLabel = (value: PontiRouteHint | ""): string =>
  ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? "Automático (todos los módulos)";

type PontiAIProvider = "legacy" | "axis";

const getPontiAIProvider = (): PontiAIProvider => {
  const provider = (import.meta.env.VITE_AI_PROVIDER as string | undefined)?.trim().toLowerCase();
  return provider === "axis" ? "axis" : "legacy";
};

const AIAssistantPage = ({ config = AI_MODULE_CONFIGS.general }: { config?: AIAssistantConfig }) => {
  const aiProvider = useMemo(() => getPontiAIProvider(), []);
  const routingIndicatorEnabled = useAiFeature("routing_indicator", true);
  const {
    filters,
    projectId,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);
  const workspace = useMemo(
    () => buildPontiWorkspace(selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField),
    [selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField]
  );

  const [routeHint, setRouteHint] = useState<PontiRouteHint | "">(config.routeHint ?? "");
  const [evidenceMessage, setEvidenceMessage] = useState<PontiConversationMessage | null>(null);
  const warnedFallbackRef = useRef<Set<string>>(new Set());
  const handoffProcessedRef = useRef(false);

  const handleAssistantDone = useCallback(
    (message: PontiConversationMessage, chatId: string | null) => {
      if (!routingIndicatorEnabled) return;
      const source = message.routing_source?.trim().toLowerCase() ?? null;
      // "read_fallback" = core degradado; en modo axis cualquier otro source también es fallback.
      const fallback =
        source === "read_fallback" ||
        source === "fallback" ||
        (aiProvider === "axis" && Boolean(source) && source !== "axis");
      if (!fallback) return;
      const key = chatId ?? "draft";
      if (warnedFallbackRef.current.has(key)) return;
      warnedFallbackRef.current.add(key);
      toastWarning("El asistente respondió en modo degradado (fallback), sin orquestación Axis.");
    },
    [aiProvider, routingIndicatorEnabled]
  );

  const {
    conversations,
    activeId,
    messages,
    input,
    setInput,
    loading,
    error,
    streamDraft,
    loadConversation,
    newChat,
    send,
    sendConfirmedActions,
    sendDetached,
  } = useAiChatSession({ headers, workspace, onAssistantDone: handleAssistantDone });

  /** Último routing_source visible (respuestas streamed o conversación cargada). */
  const lastRoutingSource = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === "assistant" && message.routing_source) {
        return message.routing_source;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (config.lockRouteHint) {
      setRouteHint(config.routeHint ?? "");
    }
  }, [config.lockRouteHint, config.routeHint]);

  // --- Fase 7: consumir handoff desde notificaciones ---
  useEffect(() => {
    if (!config.consumeNotificationHandoff || handoffProcessedRef.current || !headers) return;
    const raw = sessionStorage.getItem(NOTIFICATION_CHAT_HANDOFF_KEY);
    if (!raw) return;
    handoffProcessedRef.current = true;
    sessionStorage.removeItem(NOTIFICATION_CHAT_HANDOFF_KEY);

    let handoff: NotificationChatHandoff;
    try {
      handoff = JSON.parse(raw) as NotificationChatHandoff;
    } catch {
      return;
    }

    setRouteHint("");
    void sendDetached(handoff.suggestedMessage);
  }, [config.consumeNotificationHandoff, headers, sendDetached]);

  const handleNewChat = () => {
    newChat();
    if (config.lockRouteHint) {
      setRouteHint(config.routeHint ?? "");
    }
  };

  const handleQuickPrompt = (prompt: string, route: PontiRouteHint) => {
    setRouteHint(config.lockRouteHint ? config.routeHint ?? route : route);
    setInput(prompt);
  };

  const handleSend = () => {
    void send((config.lockRouteHint ? config.routeHint : routeHint) || "");
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <FilterBar filters={filters} />

      {!headers && (
        <p className="text-sm text-amber-700">Seleccioná un proyecto para usar el asistente.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="w-full shrink-0 rounded-lg border border-gray-200 bg-white lg:w-64">
          <div className="flex h-12 items-center justify-between gap-2 border-b border-gray-100 px-3 text-sm font-medium text-gray-700">
            <span>Conversaciones</span>
            {!config.activityOnly && (
              <Button
                size="sm"
                variant="primary"
                className="px-2 py-1 text-xs !rounded-md !bg-primary-500 hover:!bg-primary-600 !text-white disabled:!opacity-100"
                onClick={handleNewChat}
              >
                Nueva
              </Button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto lg:max-h-[32rem]">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    activeId === c.id ? "bg-primary-50 text-primary-900" : "text-gray-800"
                  }`}
                  onClick={() => void loadConversation(c.id)}
                >
                  <span className="line-clamp-2 font-medium">{c.title || "Sin título"}</span>
                  <span className="block text-xs text-gray-500">{c.message_count} mensajes</span>
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-500">No hay conversaciones aún.</li>
            )}
          </ul>
        </aside>

        <section className="flex h-[32rem] flex-1 flex-col rounded-lg border border-gray-200 bg-white">
          <div className="flex h-12 flex-wrap items-center gap-3 border-b border-gray-100 px-4">
            {config.activityOnly ? (
              <span className="text-sm font-medium text-gray-700">Actividad reciente</span>
            ) : config.lockRouteHint ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Contexto</span>
                <span className="rounded-md bg-primary-500 px-2 py-1 text-sm text-white">
                  {routeLabel(config.routeHint ?? "")}
                </span>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span>Contexto</span>
                <select
                  className="rounded-md bg-primary-500 px-2 py-1 text-sm text-white"
                  value={routeHint}
                  disabled={!headers || loading}
                  onChange={(e) => setRouteHint(e.target.value as PontiRouteHint | "")}
                >
                  {ROUTE_OPTIONS.map((o) => (
                    <option key={o.value || "auto"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <RoutingSourceChip
              source={routingIndicatorEnabled ? lastRoutingSource : null}
              defaultProvider={aiProvider}
              className="ml-auto"
            />
          </div>

          <ChatThread
            messages={messages}
            streamDraft={streamDraft}
            loading={loading}
            onShowEvidence={(message) => setEvidenceMessage(message)}
            onConfirmPending={(id) => sendConfirmedActions([id])}
            emptyState={
              <div className="space-y-3">
                {config.emptyText && <p className="text-sm text-gray-500">{config.emptyText}</p>}
                {config.quickPrompts.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {config.quickPrompts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-60"
                        disabled={!headers || loading}
                        onClick={() => handleQuickPrompt(item.prompt, item.route)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          />

          {!config.activityOnly && (
            <div className="border-t border-gray-100 p-3">
              <textarea
                className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={1}
                placeholder="Mensaje…"
                value={input}
                disabled={!headers || loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) handleSend();
                  }
                }}
              />
              <Button
                size="sm"
                variant="primary"
                className="px-6 !bg-primary-700 !text-white disabled:!opacity-100"
                disabled={!headers || loading || !input.trim()}
                onClick={handleSend}
              >
                {loading ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          )}
        </section>
      </div>

      <EvidenceDrawer
        open={evidenceMessage !== null}
        onClose={() => setEvidenceMessage(null)}
        tools={evidenceMessage?.tool_calls}
        evidence={evidenceMessage ? { items: nonTextBlocks(evidenceMessage.blocks) } : undefined}
        axisRunId={evidenceMessage?.axis_run_id ?? evidenceMessage?.run_id}
        axisTaskId={evidenceMessage?.axis_task_id ?? evidenceMessage?.task_id}
        pendingConfirmations={evidenceMessage?.pending_confirmations}
      />
    </div>
  );
};

const AIAssistant = () => <AIAssistantPage config={AI_MODULE_CONFIGS.general} />;

export const AIDashboard = () => <AIAssistantPage config={AI_MODULE_CONFIGS.dashboard} />;
export const AIStock = () => <AIAssistantPage config={AI_MODULE_CONFIGS.stock} />;
export const AIWorkOrders = () => <AIAssistantPage config={AI_MODULE_CONFIGS.workOrders} />;
export const AILots = () => <AIAssistantPage config={AI_MODULE_CONFIGS.lots} />;
export const AISupplies = () => <AIAssistantPage config={AI_MODULE_CONFIGS.supplies} />;
export const AIReports = () => <AIAssistantPage config={AI_MODULE_CONFIGS.reports} />;
export const AIInsights = () => <AIAssistantPage config={AI_MODULE_CONFIGS.insights} />;
export const AIActivity = () => <AIAssistantPage config={AI_MODULE_CONFIGS.activity} />;

export default AIAssistant;
