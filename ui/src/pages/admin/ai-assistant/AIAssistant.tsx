import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FilterBar } from "@devpablocristo/modules-ui-filters";
import Button from "../../../components/Button/Button";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import {
  getPontiChatConversation,
  listPontiChatConversations,
  pontiAssistantChat,
} from "@/api/aiClient";
import type {
  PontiConversationMessage,
  PontiConversationSummary,
  PontiRouteHint,
} from "@/types/aiChat";

const ROUTE_OPTIONS: { value: PontiRouteHint | ""; label: string }[] = [
  { value: "", label: "Automático (todos los módulos)" },
  { value: "general", label: "General" },
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
    setActiveId(null);
    setMessages([]);
    setMeta({});
    setError("");
  };

  const handleSend = async () => {
    if (!headers) return;
    const text = input.trim();
    if (!text) return;

    setLoading(true);
    setError("");
    const prevInput = text;
    setInput("");

    try {
      const res = await pontiAssistantChat(
        {
          message: prevInput,
          chat_id: activeId,
          route_hint: routeHint || undefined,
          preferred_language: "es",
        },
        headers
      );

      setActiveId(res.chat_id);
      setMeta({ routed: res.routed_agent, source: res.routing_source });
      setMessages((prev) => [
        ...prev,
        { role: "user", content: prevInput },
        { role: "assistant", content: res.reply },
      ]);
      await refreshList();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al enviar el mensaje";
      setError(message);
      setInput(prevInput);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <FilterBar filters={filters} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Asistente Ponti</h1>
          <p className="text-sm text-gray-600">
            Un solo chat para tablero, labores, insumos, campañas, lotes, stock e informes.{" "}
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
