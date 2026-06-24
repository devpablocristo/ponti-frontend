import { useCallback, useEffect, useRef, useState } from "react";

import {
  getPontiChatConversation,
  listPontiChatConversations,
  pontiAssistantChatStream,
} from "@/api/aiClient";
import {
  assistantMessageFromDone,
  compactLabel,
} from "@/pages/admin/ai-assistant/aiAssistantEvidence";
import type {
  PontiConversationMessage,
  PontiConversationSummary,
  PontiRouteHint,
  PontiWorkspaceContext,
} from "@/types/aiChat";

export type AiChatStreamDraft = { text: string; activity: string[] };

export type UseAiChatSessionOptions = {
  headers: { projectId: string } | null;
  workspace: PontiWorkspaceContext;
  /** Se invoca con cada respuesta completa (evento `done`), p. ej. para el indicador de routing. */
  onAssistantDone?: (message: PontiConversationMessage, chatId: string | null) => void;
};

/**
 * Sesión de chat del asistente Ponti (SSE): conversaciones, mensajes y streaming.
 * Cada consumidor (página, drawer flotante) instancia su propia sesión.
 */
export const useAiChatSession = ({ headers, workspace, onAssistantDone }: UseAiChatSessionOptions) => {
  const [conversations, setConversations] = useState<PontiConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PontiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Respuesta en curso (SSE); al llegar `done` se vuelca a `messages`. */
  const [streamDraft, setStreamDraft] = useState<AiChatStreamDraft | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const onAssistantDoneRef = useRef(onAssistantDone);
  onAssistantDoneRef.current = onAssistantDone;

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

  const loadConversation = useCallback(
    async (id: string) => {
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
    },
    [headers]
  );

  const newChat = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreamDraft(null);
    setActiveId(null);
    setMessages([]);
    setError("");
  }, []);

  const send = useCallback(
    async (routeHint?: PontiRouteHint | "") => {
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
              const nextId = typeof cid === "string" && cid ? cid : null;
              if (nextId) {
                setActiveId(nextId);
              }
              const assistantMessage = assistantMessageFromDone(ev.data);
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamDraft(null);
              onAssistantDoneRef.current?.(assistantMessage, nextId);
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
    },
    [headers, input, activeId, workspace, refreshList]
  );

  /**
   * Confirma acciones pendientes (pending_confirmations) enviando un turno
   * con message vacío + confirmed_actions sobre el chat activo.
   * Devuelve true solo si el stream completó con `done`.
   */
  const sendConfirmedActions = useCallback(
    async (actionIds: string[]): Promise<boolean> => {
      const ids = actionIds.map((id) => id.trim()).filter((id) => id !== "");
      if (!headers || ids.length === 0) return false;

      streamAbortRef.current?.abort();
      streamAbortRef.current = new AbortController();
      const { signal } = streamAbortRef.current;

      setLoading(true);
      setError("");
      setStreamDraft({ text: "", activity: ["Confirmando acción…"] });

      let sawDone = false;

      try {
        await pontiAssistantChatStream(
          {
            message: "",
            chat_id: activeId,
            confirmed_actions: ids,
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
              const chunk = ev.data.content;
              setStreamDraft((d) => (d ? { ...d, text: d.text + chunk } : d));
              return;
            }
            if (ev.event === "tool_call") {
              const tool = compactLabel(ev.data.tool ?? ev.data.tool_name ?? ev.data);
              setStreamDraft((d) =>
                d ? { ...d, activity: [...d.activity, `Ejecutando: ${tool}…`] } : d
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
              const nextId = typeof cid === "string" && cid ? cid : null;
              if (nextId) setActiveId(nextId);
              const assistantMessage = assistantMessageFromDone(ev.data);
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamDraft(null);
              onAssistantDoneRef.current?.(assistantMessage, nextId);
              void refreshList();
              return;
            }
            if (ev.event === "error") {
              const msg =
                typeof ev.data.message === "string"
                  ? ev.data.message
                  : "Error al confirmar la acción";
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
        return sawDone;
      } catch (err) {
        const aborted = signal.aborted || (err instanceof Error && err.name === "AbortError");
        setStreamDraft(null);
        if (!aborted) {
          setError(err instanceof Error ? err.message : "Error al confirmar la acción");
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [headers, activeId, workspace, refreshList]
  );

  /** Envío sin pasar por el input (handoff de notificaciones): reinicia la conversación. */
  const sendDetached = useCallback(
    async (text: string) => {
      if (!headers || !text.trim()) return;

      streamAbortRef.current?.abort();
      streamAbortRef.current = new AbortController();
      const { signal } = streamAbortRef.current;

      setActiveId(null);
      setMessages([{ role: "user", content: text }]);
      setError("");
      setStreamDraft({ text: "", activity: [] });
      setLoading(true);

      let sawDone = false;

      try {
        await pontiAssistantChatStream(
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
              sawDone = true;
              const cid = ev.data.chat_id;
              const nextId = typeof cid === "string" && cid ? cid : null;
              if (nextId) setActiveId(nextId);
              const assistantMessage = assistantMessageFromDone(ev.data);
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamDraft(null);
              onAssistantDoneRef.current?.(assistantMessage, nextId);
              return;
            }
            if (ev.event === "error") {
              setError(typeof ev.data.message === "string" ? ev.data.message : "Error en handoff");
              setStreamDraft(null);
            }
          },
          signal
        );

        // Stream cerrado sin `done`/`error`: igual que en send(), no dejamos el chat colgado.
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
        const message = err instanceof Error ? err.message : "Error en handoff";
        setError(message);
        setStreamDraft(null);
      } finally {
        setLoading(false);
      }
    },
    [headers, workspace]
  );

  return {
    conversations,
    activeId,
    messages,
    input,
    setInput,
    loading,
    error,
    streamDraft,
    refreshList,
    loadConversation,
    newChat,
    send,
    sendConfirmedActions,
    sendDetached,
  };
};
