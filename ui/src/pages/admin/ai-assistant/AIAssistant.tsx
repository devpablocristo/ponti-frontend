import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import {
  getPontiChatConversation,
  listPontiChatConversations,
  pontiAssistantChatStream,
} from "@/api/aiClient";
import type {
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
  { value: "copilot", label: "Copilot (handoff)" },
];

function labelForRoute(mode: string): string {
  const hit = ROUTE_OPTIONS.find((o) => o.value === mode);
  return hit?.label ?? mode;
}

const AIAssistant = () => {
  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const headers = projectId ? { projectId: String(projectId) } : null;

  const [conversations, setConversations] = useState<PontiConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PontiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [routeHint, setRouteHint] = useState<PontiRouteHint | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ routed?: string; source?: string }>({});
  /** Respuesta en curso (SSE); al llegar `done` se vuelca a `messages`. */
  const [streamDraft, setStreamDraft] = useState<{ text: string; activity: string[] } | null>(
    null
  );
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

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
      setMeta({});
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
    setMeta({});
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
        },
        headers,
        (ev) => {
          if (ev.event === "start") {
            const cid = ev.data.chat_id;
            if (typeof cid === "string" && cid) {
              setActiveId(cid);
            }
            const routed = ev.data.routed_agent;
            const source = ev.data.routing_source;
            if (typeof routed === "string" && typeof source === "string") {
              setMeta({ routed, source });
            }
            return;
          }
          if (ev.event === "text" && typeof ev.data.content === "string") {
            const chunk = ev.data.content;
            setStreamDraft((d) => (d ? { ...d, text: d.text + chunk } : d));
            return;
          }
          if (ev.event === "tool_call") {
            const tool = typeof ev.data.tool === "string" ? ev.data.tool : "?";
            setStreamDraft((d) =>
              d ? { ...d, activity: [...d.activity, `Consultando: ${tool}…`] } : d
            );
            return;
          }
          if (ev.event === "tool_result") {
            const tool = typeof ev.data.tool === "string" ? ev.data.tool : "?";
            setStreamDraft((d) =>
              d ? { ...d, activity: [...d.activity, `Listo: ${tool}`] } : d
            );
            return;
          }
          if (ev.event === "done") {
            sawDone = true;
            const reply = typeof ev.data.reply === "string" ? ev.data.reply : "";
            const rawTools = ev.data.tool_calls;
            const toolCalls = Array.isArray(rawTools)
              ? rawTools.filter((t): t is string => typeof t === "string")
              : [];
            const routed = ev.data.routed_agent;
            const source = ev.data.routing_source;
            if (typeof routed === "string" && typeof source === "string") {
              setMeta({ routed, source });
            }
            const cid = ev.data.chat_id;
            if (typeof cid === "string" && cid) {
              setActiveId(cid);
            }
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: reply,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
              },
            ]);
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
      const aborted =
        signal.aborted || (err instanceof Error && err.name === "AbortError");
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Asesor de proyecto Ponti</h1>
          <p className="text-sm text-gray-600">
            Un solo chat con contexto del proyecto para tablero, labores, insumos, campañas, lotes, stock e informes.{" "}
            <Link className="text-blue-600 hover:underline" to="/admin/ai-copilot">
              Copilot por insight
            </Link>
            .
          </p>
        </div>
        <Button size="sm" variant="secondary" className="px-4" onClick={handleNewChat}>
          Nueva conversación
        </Button>
      </div>

      {!headers && (
        <p className="text-sm text-amber-700">Seleccioná un proyecto para usar el asistente.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="w-full shrink-0 rounded-lg border border-gray-200 bg-white lg:w-64">
          <div className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
            Conversaciones
          </div>
          <ul className="max-h-80 overflow-y-auto lg:max-h-[32rem]">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    activeId === c.id ? "bg-blue-50 text-blue-900" : "text-gray-800"
                  }`}
                  onClick={() => void loadConversation(c.id)}
                >
                  <span className="line-clamp-2 font-medium">{c.title || "Sin título"}</span>
                  <span className="block text-xs text-gray-500">
                    {c.message_count} mensajes
                  </span>
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-500">No hay conversaciones aún.</li>
            )}
          </ul>
        </aside>

        <section className="flex min-h-[28rem] flex-1 flex-col rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Contexto</span>
              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm"
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
            {meta.routed && (
              <span className="text-xs text-gray-500">
                Ruta: {labelForRoute(meta.routed)} · origen: {meta.source}
              </span>
            )}
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
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.tool_calls && m.tool_calls.length > 0 && (
                  <div className="mt-1 text-xs opacity-80">
                    Tools: {m.tool_calls.join(", ")}
                  </div>
                )}
              </div>
            ))}
            {streamDraft && (
              <div className="mr-auto max-w-[90%] rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {streamDraft.activity.length > 0 && (
                  <ul className="mb-2 list-inside list-disc text-xs text-gray-600">
                    {streamDraft.activity.map((line, i) => (
                      <li key={`${i}-${line}`}>{line}</li>
                    ))}
                  </ul>
                )}
                <div className="whitespace-pre-wrap">
                  {streamDraft.text}
                  {loading && (
                    <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-gray-400 align-middle" />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-3">
            <textarea
              className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Mensaje…"
              value={input}
              disabled={!headers || loading}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              size="sm"
              variant="primary"
              className="px-6"
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
