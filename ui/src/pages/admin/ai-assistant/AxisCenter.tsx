import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  BookmarkPlus,
  Brain,
  CheckCircle2,
  Clock3,
  Eye,
  GitBranch,
  Play,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FilterBar } from "@devpablocristo/modules-ui-filters";

import {
  axisCenterChat,
  createAxisMemory,
  ensurePontiAxisWatchers,
  getAxisCenterContext,
  getAxisTask,
  getAxisTaskGraph,
  listAxisMemory,
  listAxisRunTraces,
  listAxisTasks,
  listAxisWatcherProposals,
  listAxisWatchers,
  runAxisWatcher,
  syncAxisWatcherProposals,
} from "@/api/aiClient";
import { useWorkspaceFilters } from "@/hooks/useWorkspaceFilters";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type {
  AxisCenterChatResponse,
  AxisCenterContext,
  AxisMemoryEntry,
  AxisRunTrace,
  AxisTask,
  AxisTaskDetail,
  AxisTaskMessage,
  AxisWatcher,
  AxisWatcherProposal,
  PontiWorkspaceContext,
} from "@/types/aiChat";

type PanelTab = "memoria" | "plan" | "watchers" | "evidencia" | "trazas";

const tabs: Array<{ key: PanelTab; label: string; icon: typeof Brain }> = [
  { key: "memoria", label: "Memoria", icon: Brain },
  { key: "plan", label: "Plan", icon: GitBranch },
  { key: "watchers", label: "Watchers", icon: Radar },
  { key: "evidencia", label: "Evidencia", icon: ShieldCheck },
  { key: "trazas", label: "Trazas", icon: Activity },
];

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

const compactDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const taskItems = (response: { data?: AxisTask[]; items?: AxisTask[] } | null): AxisTask[] =>
  response?.data ?? response?.items ?? [];

const memoryItems = (
  response: { entries?: AxisMemoryEntry[]; results?: Array<{ entry: AxisMemoryEntry }> } | null
): AxisMemoryEntry[] => {
  if (Array.isArray(response?.entries)) return response.entries;
  if (Array.isArray(response?.results)) return response.results.map((item) => item.entry);
  return [];
};

const toolName = (tool: unknown): string => {
  if (typeof tool === "string") return tool;
  if (!tool || typeof tool !== "object") return "tool";
  const record = tool as Record<string, unknown>;
  return String(record.name || record.tool || record.capability_id || "tool");
};

const statusClass = (status?: string): string => {
  switch (status) {
    case "ready":
    case "completed":
    case "active":
    case "executed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "degraded":
    case "pending":
    case "running":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "failed":
    case "unconfigured":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const MessageBubble = ({
  message,
  onRemember,
}: {
  message: AxisTaskMessage;
  onRemember: (text: string) => void;
}) => {
  const isAssistant = message.author_type === "assistant" || message.author_type === "system";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-lg border px-3 py-2 text-sm ${
          isAssistant ? "border-gray-200 bg-gray-50 text-gray-800" : "border-primary-700 bg-primary-700 text-white"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.body}</div>
        <div className={`mt-2 flex items-center gap-2 text-[11px] ${isAssistant ? "text-gray-500" : "text-white/75"}`}>
          <span>{message.author_type}</span>
          {message.created_at && <span>{compactDate(message.created_at)}</span>}
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
              isAssistant ? "bg-white text-gray-600 hover:text-primary-700" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={() => onRemember(message.body)}
          >
            <BookmarkPlus className="h-3 w-3" aria-hidden />
            Recordar
          </button>
        </div>
      </div>
    </div>
  );
};

const AxisCenter = () => {
  const { filters, projectId, selectedCustomer, selectedProject, selectedCampaignId, selectedField, campaigns } =
    useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const workspace = useMemo(
    () => buildWorkspace(selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField),
    [selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField]
  );
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);
  const ready = workspaceReady(workspace);

  const [context, setContext] = useState<AxisCenterContext | null>(null);
  const [tasks, setTasks] = useState<AxisTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<AxisTaskDetail | null>(null);
  const [graphEvents, setGraphEvents] = useState<Record<string, unknown>[]>([]);
  const [memory, setMemory] = useState<AxisMemoryEntry[]>([]);
  const [watchers, setWatchers] = useState<AxisWatcher[]>([]);
  const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<AxisWatcherProposal[]>([]);
  const [traces, setTraces] = useState<AxisRunTrace[]>([]);
  const [lastChat, setLastChat] = useState<AxisCenterChatResponse | null>(null);
  const [message, setMessage] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [tab, setTab] = useState<PanelTab>("memoria");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadAxis = useCallback(async () => {
    if (!headers) return;
    setLoading(true);
    setError("");
    try {
      const [ctxRes, taskRes, memoryRes, watcherRes, traceRes] = await Promise.allSettled([
        getAxisCenterContext(headers),
        listAxisTasks(headers, 50),
        listAxisMemory(headers, { scope_type: "org", limit: 30 }),
        listAxisWatchers(headers),
        listAxisRunTraces(headers, { limit: 30 }),
      ]);
      if (ctxRes.status === "fulfilled") setContext(ctxRes.value);
      if (taskRes.status === "fulfilled") setTasks(taskItems(taskRes.value));
      if (memoryRes.status === "fulfilled") setMemory(memoryItems(memoryRes.value));
      if (watcherRes.status === "fulfilled") {
        const nextWatchers = watcherRes.value.watchers ?? [];
        setWatchers(nextWatchers);
        setSelectedWatcherId((current) => current ?? nextWatchers[0]?.id ?? null);
      }
      if (traceRes.status === "fulfilled") setTraces(traceRes.value.traces ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar Centro Axis");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void loadAxis();
  }, [loadAxis]);

  useEffect(() => {
    const raw = sessionStorage.getItem(NOTIFICATION_CHAT_HANDOFF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { suggestedMessage?: string; title?: string; body?: string };
      const suggested =
        parsed.suggestedMessage ||
        (parsed.title ? `Investigá esta decisión operativa: ${parsed.title}. ${parsed.body || ""}` : "");
      if (suggested) setMessage(suggested);
      sessionStorage.removeItem(NOTIFICATION_CHAT_HANDOFF_KEY);
    } catch {
      sessionStorage.removeItem(NOTIFICATION_CHAT_HANDOFF_KEY);
    }
  }, []);

  useEffect(() => {
    if (!headers || !selectedTaskId) {
      setTaskDetail(null);
      setGraphEvents([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const [detail, graph, traceRes] = await Promise.all([
          getAxisTask(selectedTaskId, headers),
          getAxisTaskGraph(selectedTaskId, headers).catch(() => ({ events: [] })),
          listAxisRunTraces(headers, { task_id: selectedTaskId, limit: 30 }).catch(() => ({ traces: [] })),
        ]);
        if (cancelled) return;
        setTaskDetail(detail);
        setGraphEvents(graph.events ?? ("data" in graph ? graph.data ?? [] : []));
        setTraces(traceRes.traces ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar la tarea Axis");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [headers, selectedTaskId]);

  useEffect(() => {
    if (!headers || !selectedWatcherId) {
      setProposals([]);
      return;
    }
    void listAxisWatcherProposals(selectedWatcherId, headers)
      .then((res) => setProposals(res.proposals ?? []))
      .catch(() => setProposals([]));
  }, [headers, selectedWatcherId]);

  const messages = taskDetail?.messages ?? lastChat?.messages ?? [];
  const selectedWatcher = watchers.find((watcher) => watcher.id === selectedWatcherId) ?? watchers[0] ?? null;
  const contextReady = context?.status === "ready";

  const sendMessage = async () => {
    if (!headers || !ready || !message.trim()) return;
    const text = message.trim();
    setMessage("");
    setBusy("chat");
    setError("");
    try {
      const response = await axisCenterChat(
        {
          message: text,
          task_id: selectedTaskId,
          chat_id: selectedTaskId,
          route_hint: "dashboard",
          preferred_language: "es",
          workspace,
        },
        headers
      );
      setLastChat(response);
      const nextTaskId = response.task_id || response.axis_task_id || selectedTaskId;
      if (nextTaskId) setSelectedTaskId(nextTaskId);
      await loadAxis();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar mensaje a Axis");
    } finally {
      setBusy("");
    }
  };

  const saveMemory = async () => {
    if (!headers || !memoryDraft.trim()) return;
    setBusy("memory");
    setError("");
    try {
      await createAxisMemory(
        {
          content_text: memoryDraft.trim(),
          kind: "user_preference",
          memory_type: "preference",
          scope_type: "org",
          workspace,
          confirmed: true,
        },
        headers
      );
      setMemoryDraft("");
      const next = await listAxisMemory(headers, { scope_type: "org", limit: 30 });
      setMemory(memoryItems(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar memoria");
    } finally {
      setBusy("");
    }
  };

  const ensureWatchers = async () => {
    if (!headers || !ready) return;
    setBusy("watchers");
    setError("");
    try {
      await ensurePontiAxisWatchers({ workspace }, headers);
      const next = await listAxisWatchers(headers);
      setWatchers(next.watchers ?? []);
      setSelectedWatcherId((next.watchers ?? [])[0]?.id ?? null);
      setTab("watchers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron asegurar watchers");
    } finally {
      setBusy("");
    }
  };

  const runSelectedWatcher = async () => {
    if (!headers || !ready || !selectedWatcher) return;
    setBusy("run-watcher");
    setError("");
    try {
      await runAxisWatcher(selectedWatcher.id, { workspace }, headers);
      const synced = await syncAxisWatcherProposals(selectedWatcher.id, { workspace }, headers).catch(() => null);
      const proposalRes = await listAxisWatcherProposals(selectedWatcher.id, headers);
      setProposals(proposalRes.proposals ?? synced?.proposals ?? []);
      await loadAxis();
      setTab("watchers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar watcher");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col gap-4 px-6 py-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Centro Axis</h1>
          <span className="inline-flex items-center rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
            Axis
          </span>
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium ${statusClass(context?.status)}`}>
            {contextReady ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
            {context?.status || "cargando"}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            {context?.agent_id || "ponti-ops-manager"}
          </span>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            disabled={!headers || loading}
            onClick={() => void loadAxis()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Actualizar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-60"
            disabled={!headers || !ready || busy === "watchers"}
            onClick={() => void ensureWatchers()}
          >
            <Radar className="h-4 w-4" aria-hidden />
            Activar watchers
          </button>
        </div>
        <FilterBar filters={filters} />
        {!ready && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Seleccioná cliente, proyecto y campaña.
          </p>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </header>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_430px]">
        <aside className="min-h-0 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-gray-900">Tareas</h2>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setSelectedTaskId(null);
                setTaskDetail(null);
                setLastChat(null);
              }}
            >
              Nueva
            </button>
          </div>
          <div className="max-h-[68vh] space-y-2 overflow-auto p-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left transition hover:border-primary-300 ${
                  selectedTaskId === task.id ? "border-primary-400 bg-primary-50" : "border-gray-200 bg-white"
                }`}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-semibold text-gray-900">{task.title}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(task.status)}`}>
                    {task.status || "task"}
                  </span>
                </div>
                {task.summary && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{task.summary}</p>}
                <p className="mt-2 text-[11px] text-gray-500">{compactDate(task.updated_at || task.created_at)}</p>
              </button>
            ))}
            {tasks.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
                Sin tareas Axis.
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {taskDetail?.task.title || selectedTaskId || "Misión nueva"}
              </h2>
              <p className="text-xs text-gray-500">
                {selectedTaskId ? `task ${selectedTaskId.slice(0, 8)}` : "Axis creará una tarea durable al enviar"}
              </p>
            </div>
            {lastChat?.axis_run_id && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                run {lastChat.axis_run_id.slice(0, 8)}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-gray-50 p-4">
            {messages.map((item, index) => (
              <MessageBubble
                key={item.id || `${index}-${item.created_at || ""}`}
                message={item}
                onRemember={(text) => {
                  setMemoryDraft(text);
                  setTab("memoria");
                }}
              />
            ))}
            {messages.length === 0 && (
              <div className="flex h-full min-h-80 items-center justify-center">
                <div className="text-center text-sm text-gray-500">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-gray-400" aria-hidden />
                  Nueva misión Axis.
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <textarea
                className="min-h-12 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="Mensaje..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-60"
                disabled={!headers || !ready || !message.trim() || busy === "chat"}
                onClick={() => void sendMessage()}
                title="Enviar"
              >
                <Send className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </main>

        <aside className="min-h-0 rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-5 border-b border-gray-200">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex h-12 items-center justify-center border-r border-gray-200 text-xs last:border-r-0 ${
                    tab === item.key ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setTab(item.key)}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              );
            })}
          </div>

          <div className="max-h-[74vh] overflow-auto p-4">
            {tab === "memoria" && (
              <div className="space-y-3">
                <div className="rounded-md border border-gray-200 p-3">
                  <label className="text-xs font-semibold uppercase text-gray-500" htmlFor="axis-memory-draft">
                    Recordar
                  </label>
                  <textarea
                    id="axis-memory-draft"
                    className="mt-2 min-h-24 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    value={memoryDraft}
                    onChange={(event) => setMemoryDraft(event.target.value)}
                    placeholder="Preferencia, regla o criterio..."
                  />
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary-700 px-3 py-2 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-60"
                    disabled={!headers || !memoryDraft.trim() || busy === "memory"}
                    onClick={() => void saveMemory()}
                  >
                    <BookmarkPlus className="h-4 w-4" aria-hidden />
                    Guardar memoria
                  </button>
                </div>
                {memory.map((item) => (
                  <div key={item.id} className="rounded-md border border-gray-200 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700">{item.kind}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(item.status)}`}>
                        {item.status || item.memory_type}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{item.content_text}</p>
                    <p className="mt-2 text-[11px] text-gray-500">{compactDate(item.updated_at || item.created_at)}</p>
                  </div>
                ))}
                {memory.length === 0 && <p className="text-sm text-gray-500">Sin memoria confirmada.</p>}
              </div>
            )}

            {tab === "plan" && (
              <div className="space-y-3">
                {taskDetail?.durable_plan ? (
                  <>
                    <div className="rounded-md border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">Objetivo</p>
                      <p className="mt-1 text-sm text-gray-800">{taskDetail.durable_plan.objective || taskDetail.task.goal}</p>
                      {taskDetail.durable_plan.next_action && (
                        <p className="mt-2 rounded bg-primary-50 px-2 py-1 text-xs text-primary-800">
                          {taskDetail.durable_plan.next_action}
                        </p>
                      )}
                    </div>
                    {(taskDetail.durable_plan.steps ?? []).map((step) => (
                      <div key={step.id} className="rounded-md border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{step.title}</span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                        {(step.tool_name || step.capability) && (
                          <p className="mt-1 text-xs text-gray-500">{step.tool_name || step.capability}</p>
                        )}
                        {step.observation && <p className="mt-2 text-sm text-gray-700">{step.observation}</p>}
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Sin plan durable para la tarea seleccionada.</p>
                )}
                {graphEvents.length > 0 && (
                  <div className="rounded-md border border-gray-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Grafo</p>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                      {JSON.stringify(graphEvents.slice(0, 8), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {tab === "watchers" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    disabled={!headers || busy === "watchers"}
                    onClick={() => void ensureWatchers()}
                  >
                    <Radar className="h-4 w-4" aria-hidden />
                    Asegurar
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-3 py-2 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-60"
                    disabled={!selectedWatcher || busy === "run-watcher"}
                    onClick={() => void runSelectedWatcher()}
                  >
                    <Play className="h-4 w-4" aria-hidden />
                    Ejecutar
                  </button>
                </div>
                <div className="space-y-2">
                  {watchers.map((watcher) => (
                    <button
                      key={watcher.id}
                      type="button"
                      className={`w-full rounded-md border p-3 text-left ${
                        selectedWatcherId === watcher.id ? "border-primary-400 bg-primary-50" : "border-gray-200 bg-white"
                      }`}
                      onClick={() => setSelectedWatcherId(watcher.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-semibold text-gray-900">{watcher.name}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(watcher.enabled ? "active" : "")}`}>
                          {watcher.enabled ? "activo" : "off"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{compactDate(watcher.last_run_at || watcher.updated_at)}</p>
                    </button>
                  ))}
                  {watchers.length === 0 && <p className="text-sm text-gray-500">Sin watchers Ponti activos.</p>}
                </div>
                {proposals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Propuestas</p>
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-md border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{proposal.action_type || "proposal"}</span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(proposal.execution_status)}`}>
                            {proposal.execution_status || "pending"}
                          </span>
                        </div>
                        {proposal.reason && <p className="mt-1 text-sm text-gray-700">{proposal.reason}</p>}
                        {proposal.nexus_request_id && (
                          <p className="mt-2 text-xs text-gray-500">nexus {proposal.nexus_request_id.slice(0, 8)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "evidencia" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {lastChat?.axis_run_id && <span className="rounded bg-gray-100 px-2 py-1">run {lastChat.axis_run_id.slice(0, 8)}</span>}
                  {(lastChat?.axis_task_id || selectedTaskId) && (
                    <span className="rounded bg-gray-100 px-2 py-1">task {(lastChat?.axis_task_id || selectedTaskId || "").slice(0, 8)}</span>
                  )}
                </div>
                {(lastChat?.tool_calls ?? []).map((tool, index) => (
                  <div key={`${index}-${toolName(tool)}`} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{toolName(tool)}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(tool.status)}`}>
                        {tool.status || (tool.allowed ? "allowed" : "tool")}
                      </span>
                    </div>
                    {tool.decision_reason && <p className="mt-1 text-xs text-gray-600">{tool.decision_reason}</p>}
                    {tool.error && <p className="mt-1 text-xs text-red-700">{tool.error}</p>}
                  </div>
                ))}
                {(lastChat?.pending_confirmations ?? []).map((item, index) => (
                  <div key={index} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <Clock3 className="mr-1 inline h-4 w-4" aria-hidden />
                    {String(item.message || item.status || "Aprobación pendiente")}
                  </div>
                ))}
                {!lastChat?.tool_calls?.length && !lastChat?.pending_confirmations?.length && (
                  <p className="text-sm text-gray-500">Sin evidencia de tool calls en la última respuesta.</p>
                )}
              </div>
            )}

            {tab === "trazas" && (
              <div className="space-y-2">
                {traces.map((trace, index) => (
                  <div key={String(trace.run_id || trace.id || index)} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {String(trace.run_id || trace.id || "run").slice(0, 8)}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(String(trace.status || ""))}`}>
                        {String(trace.status || trace.intent || "trace")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {compactDate(String(trace.completed_at || trace.started_at || trace.created_at || ""))}
                    </p>
                    {Array.isArray(trace.tool_calls) && trace.tool_calls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {trace.tool_calls.slice(0, 4).map((tool, toolIndex) => (
                          <span key={`${toolIndex}-${toolName(tool)}`} className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
                            {toolName(tool)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {traces.length === 0 && (
                  <div className="rounded-md border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
                    <Eye className="mx-auto mb-2 h-5 w-5 text-gray-400" aria-hidden />
                    Sin trazas Axis.
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AxisCenter;
