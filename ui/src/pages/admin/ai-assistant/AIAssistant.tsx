import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, ShieldCheck, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import {
  getPontiChatConversation,
  listPontiChatConversations,
  pontiAssistantChatStream,
} from "@/api/aiClient";
import { NOTIFICATION_CHAT_HANDOFF_KEY } from "@/lib/notificationChatHandoff";
import type { NotificationChatHandoff } from "@/lib/notificationChatHandoff";
import type {
  PontiChatBlock,
  PontiChatPendingConfirmation,
  PontiChatToolCall,
  PontiConversationMessage,
  PontiConversationSummary,
  PontiRouteHint,
} from "@/types/aiChat";

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

const MARKDOWN_CLASS =
  "prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:rounded prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-table:text-xs prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1 prose-headings:mb-1 prose-headings:mt-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0";

const AssistantMarkdown = ({ content }: { content: string }) => (
  <div className={MARKDOWN_CLASS}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

type PontiAIProvider = "legacy" | "axis";

const getPontiAIProvider = (): PontiAIProvider => {
  const provider = (import.meta.env.VITE_AI_PROVIDER as string | undefined)?.trim().toLowerCase();
  return provider === "axis" ? "axis" : "legacy";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const firstString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
};

const compactLabel = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "?";
  return firstString(value, ["name", "tool", "tool_name", "capability_id", "id", "type"]) ?? "?";
};

const normalizeArray = <T,>(value: unknown, guard: (item: unknown) => item is T): T[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(guard);
};

const isChatToolCall = (value: unknown): value is PontiChatToolCall =>
  typeof value === "string" || isRecord(value);

const isChatBlock = (value: unknown): value is PontiChatBlock => isRecord(value);

const isPendingConfirmation = (value: unknown): value is PontiChatPendingConfirmation =>
  typeof value === "string" || isRecord(value);

const toolCallsFrom = (value: unknown): PontiChatToolCall[] =>
  normalizeArray(value, isChatToolCall);

const blocksFrom = (value: unknown): PontiChatBlock[] => normalizeArray(value, isChatBlock);

const pendingConfirmationsFrom = (value: unknown): PontiChatPendingConfirmation[] =>
  normalizeArray(value, isPendingConfirmation);

const optionalString = (value: unknown): string | null | undefined => asString(value);

const maybeArray = <T,>(items: T[]): T[] | undefined => (items.length > 0 ? items : undefined);

const assistantMessageFromDone = (data: Record<string, unknown>): PontiConversationMessage => ({
  role: "assistant",
  content: asString(data.reply) ?? "",
  tool_calls: maybeArray(toolCallsFrom(data.tool_calls)),
  pending_confirmations: maybeArray(pendingConfirmationsFrom(data.pending_confirmations)),
  blocks: maybeArray(blocksFrom(data.blocks)),
  routed_agent: optionalString(data.routed_agent),
  routing_source: optionalString(data.routing_source),
  axis_run_id: optionalString(data.axis_run_id),
  axis_task_id: optionalString(data.axis_task_id),
  run_id: optionalString(data.run_id),
  task_id: optionalString(data.task_id),
});

const blockTitle = (block: PontiChatBlock): string => {
  if (!isRecord(block)) return "Bloque";
  return firstString(block, ["title", "label", "source_ref", "source", "type"]) ?? "Bloque";
};

const blockDetail = (block: PontiChatBlock): string | null => {
  if (!isRecord(block)) return null;
  return firstString(block, ["summary", "description", "message", "captured_at"]);
};

const nonTextBlocks = (blocks?: PontiChatBlock[]): PontiChatBlock[] =>
  (blocks ?? []).filter((block) => {
    if (!isRecord(block)) return true;
    return firstString(block, ["type"]) !== "text";
  });

const AssistantEvidence = ({ message }: { message: PontiConversationMessage }) => {
  const tools = message.tool_calls ?? [];
  const blocks = nonTextBlocks(message.blocks);
  const pending = message.pending_confirmations ?? [];
  const source = message.routing_source ?? message.routed_agent;

  if (tools.length === 0 && blocks.length === 0 && pending.length === 0 && !source) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gray-200 pt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        <span>Evidencia</span>
        {source && (
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-500">{source}</span>
        )}
      </div>

      {tools.length > 0 && (
        <ul className="space-y-1">
          {tools.map((tool, index) => {
            const status = isRecord(tool)
              ? firstString(tool, ["status", "state", "result_status"])
              : null;
            return (
              <li
                key={`${index}-${compactLabel(tool)}`}
                className="flex min-w-0 items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
              >
                <Wrench className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{compactLabel(tool)}</span>
                {status && (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                    {status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {blocks.length > 0 && (
        <ul className="space-y-1">
          {blocks.map((block, index) => (
            <li
              key={`${index}-${blockTitle(block)}`}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
            >
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{blockTitle(block)}</span>
              </div>
              {blockDetail(block) && (
                <p className="mt-0.5 line-clamp-2 pl-5 text-[11px] text-gray-500">
                  {blockDetail(block)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="space-y-1">
          {pending.map((item, index) => (
            <li
              key={`${index}-${compactLabel(item)}`}
              className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
            >
              Pendiente: {compactLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AIAssistant = () => {
  const aiProvider = useMemo(() => getPontiAIProvider(), []);
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
  const workspace = useMemo(() => {
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
  }, [selectedCustomer, selectedProject, projectId, selectedCampaignId, campaigns, selectedField]);

  const [conversations, setConversations] = useState<PontiConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PontiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [routeHint, setRouteHint] = useState<PontiRouteHint | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Respuesta en curso (SSE); al llegar `done` se vuelca a `messages`. */
  const [streamDraft, setStreamDraft] = useState<{ text: string; activity: string[] } | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handoffProcessedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamDraft]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  // --- Fase 7: consumir handoff desde notificaciones ---
  useEffect(() => {
    if (handoffProcessedRef.current || !headers) return;
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

    const text = handoff.suggestedMessage;

    setActiveId(null);
    setMessages([{ role: "user", content: text }]);
    setRouteHint("");
    setError("");
    setStreamDraft({ text: "", activity: [] });
    setLoading(true);

    const abort = new AbortController();
    streamAbortRef.current = abort;

    pontiAssistantChatStream(
      {
        message: text,
        preferred_language: "es",
        workspace,
      },
      headers,
      (ev) => {
        if (ev.event === "start") {
          const cid = ev.data.chat_id;
          if (typeof cid === "string" && cid) setActiveId(cid);
          return;
        }
        if (ev.event === "text" && typeof ev.data.content === "string") {
          setStreamDraft((d) => (d ? { ...d, text: d.text + ev.data.content } : d));
          return;
        }
        if (ev.event === "tool_call") {
          const tool = compactLabel(ev.data.tool ?? ev.data.tool_name ?? ev.data);
          setStreamDraft((d) =>
            d ? { ...d, activity: [...d.activity, `Consultando: ${tool}…`] } : d
          );
          return;
        }
        if (ev.event === "done") {
          const cid = ev.data.chat_id;
          if (typeof cid === "string" && cid) setActiveId(cid);
          setMessages((prev) => [...prev, assistantMessageFromDone(ev.data)]);
          setStreamDraft(null);
          setLoading(false);
          return;
        }
        if (ev.event === "error") {
          setError(typeof ev.data.message === "string" ? ev.data.message : "Error en handoff");
          setStreamDraft(null);
          setLoading(false);
        }
      },
      abort.signal
    ).catch(() => {
      setStreamDraft(null);
      setLoading(false);
    });
  }, [headers]);

  const refreshList = useCallback(async () => {
    if (!headers) return;
    try {
      const res = await listPontiChatConversations(headers);
      setConversations(res.items);
    } catch {
      setConversations([]);
    }
  }, [headers]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const loadConversation = async (id: string) => {
    if (!headers) return;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreamDraft(null);
    setLoading(true);
    setError("");
    try {
      const d = await getPontiChatConversation(id, headers);
      setActiveId(d.id);
      setMessages(d.messages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la conversación";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreamDraft(null);
    setActiveId(null);
    setMessages([]);
    setError("");
  };

  const handleSend = async () => {
    if (!headers) return;
    const text = input.trim();
    if (!text) return;

    streamAbortRef.current?.abort();
    streamAbortRef.current = new AbortController();
    const { signal } = streamAbortRef.current;

    setLoading(true);
    setError("");
    const prevInput = text;
    setInput("");
    setStreamDraft({ text: "", activity: [] });
    setMessages((prev) => [...prev, { role: "user", content: prevInput }]);

    let sawDone = false;

    try {
      await pontiAssistantChatStream(
        {
          message: prevInput,
          chat_id: activeId,
          route_hint: routeHint || undefined,
          preferred_language: "es",
          workspace,
        },
        headers,
        (ev) => {
          if (ev.event === "start") {
            const cid = ev.data.chat_id;
            if (typeof cid === "string" && cid) {
              setActiveId(cid);
            }
            return;
          }
          if (ev.event === "text" && typeof ev.data.content === "string") {
            const chunk = ev.data.content;
            setStreamDraft((d) => (d ? { ...d, text: d.text + chunk } : d));
            return;
          }
          if (ev.event === "tool_call") {
            const tool = compactLabel(ev.data.tool ?? ev.data.tool_name ?? ev.data);
            setStreamDraft((d) =>
              d ? { ...d, activity: [...d.activity, `Consultando: ${tool}…`] } : d
            );
            return;
          }
          if (ev.event === "tool_result") {
            const tool = compactLabel(ev.data.tool ?? ev.data.tool_name ?? ev.data);
            setStreamDraft((d) => (d ? { ...d, activity: [...d.activity, `Listo: ${tool}`] } : d));
            return;
          }
          if (ev.event === "done") {
            sawDone = true;
            const cid = ev.data.chat_id;
            if (typeof cid === "string" && cid) {
              setActiveId(cid);
            }
            setMessages((prev) => [...prev, assistantMessageFromDone(ev.data)]);
            setStreamDraft(null);
            void refreshList();
            return;
          }
          if (ev.event === "error") {
            const msg =
              typeof ev.data.message === "string"
                ? ev.data.message
                : "Error en el stream del asistente";
            setError(msg);
            setStreamDraft(null);
          }
        },
        signal
      );

      if (!sawDone && !signal.aborted) {
        setError("La respuesta del asistente se cortó antes de terminar.");
        setStreamDraft(null);
      }
    } catch (err) {
      const aborted = signal.aborted || (err instanceof Error && err.name === "AbortError");
      if (aborted) {
        setStreamDraft(null);
        return;
      }
      const message = err instanceof Error ? err.message : "Error al enviar el mensaje";
      setError(message);
      setInput(prevInput);
      setMessages((prev) => prev.slice(0, -1));
      setStreamDraft(null);
    } finally {
      setLoading(false);
    }
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
            <Button
              size="sm"
              variant="primary"
              className="px-2 py-1 text-xs !rounded-md !bg-primary-500 hover:!bg-primary-600 !text-white disabled:!opacity-100"
              onClick={handleNewChat}
            >
              Nueva
            </Button>
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
            <span
              className={`ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                aiProvider === "axis"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <Bot className="h-3.5 w-3.5" aria-hidden />
              {aiProvider === "axis" ? "Axis" : "Legacy"}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">
                Escribí una pregunta sobre tu proyecto (insights, labores, insumos, lotes, etc.).
              </p>
            )}
            {messages.map((m, idx) => (
              <div
                key={`${idx}-${m.ts ?? ""}-${m.role}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto max-w-[90%] bg-primary-700 text-white"
                    : "w-full bg-gray-100 text-gray-900"
                }`}
              >
                {m.role === "assistant" ? (
                  <>
                    <AssistantMarkdown content={m.content} />
                    <AssistantEvidence message={m} />
                  </>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            ))}
            {streamDraft && (
              <div className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {streamDraft.activity.length > 0 && (
                  <ul className="mb-2 list-inside list-disc text-xs text-gray-600">
                    {streamDraft.activity.map((line, i) => (
                      <li key={`${i}-${line}`}>{line}</li>
                    ))}
                  </ul>
                )}
                <div>
                  {streamDraft.text && <AssistantMarkdown content={streamDraft.text} />}
                  {loading && (
                    <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-gray-400 align-middle" />
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
                  if (input.trim() && !loading) void handleSend();
                }
              }}
            />
            <Button
              size="sm"
              variant="primary"
              className="px-6 !bg-primary-700 !text-white disabled:!opacity-100"
              disabled={!headers || loading || !input.trim()}
              onClick={() => void handleSend()}
            >
              {loading ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIAssistant;
