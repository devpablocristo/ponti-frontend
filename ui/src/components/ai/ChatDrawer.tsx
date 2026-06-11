import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Bot, Expand, MessageSquareText, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ChatThread from "@/components/ai/ChatThread";
import Drawer from "@/components/Drawer/Drawer";
import { useAiChatSession } from "@/hooks/useAiChatSession";
import { useAiFeature } from "@/hooks/useAiFeatures";
import { buildPontiWorkspace } from "@/lib/aiWorkspace";
import { useSelection } from "@/pages/login/context/useSelection";

type ChatDrawerContextValue = {
  enabled: boolean;
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const ChatDrawerContext = createContext<ChatDrawerContextValue>({
  enabled: false,
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export const useChatDrawer = (): ChatDrawerContextValue => useContext(ChatDrawerContext);

const ChatDrawerContent = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { customer, project, projectId, campaign, field } = useSelection();

  const workspace = useMemo(
    () =>
      buildPontiWorkspace(
        customer,
        project,
        projectId ?? null,
        campaign?.id,
        campaign ? [campaign] : undefined,
        field
      ),
    [customer, project, projectId, campaign, field]
  );
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);

  const { messages, input, setInput, loading, error, streamDraft, send, sendConfirmedActions } =
    useAiChatSession({
      headers,
      workspace,
    });

  const contextChips = [customer?.name, project?.name, campaign?.name, field?.name].filter(
    (name): name is string => Boolean(name)
  );

  const handleSend = () => {
    void send("");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2 pr-8">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Bot className="h-4 w-4 text-primary-700" aria-hidden />
            Asistente
          </h2>
          {contextChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contextChips.map((name) => (
                <span key={name} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => {
            onClose();
            navigate("/admin/ai-assistant");
          }}
        >
          <Expand className="h-3.5 w-3.5" aria-hidden />
          Abrir completo
        </button>
      </div>

      {!headers && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Seleccioná un proyecto para usar el asistente.
        </p>
      )}
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ChatThread
        messages={messages}
        streamDraft={streamDraft}
        loading={loading}
        onConfirmPending={(id) => sendConfirmedActions([id])}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"
        emptyState={
          <p className="text-sm text-gray-500">Preguntale al asistente sobre el workspace seleccionado.</p>
        }
      />

      <div className="flex gap-2">
        <textarea
          className="min-h-12 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          rows={1}
          placeholder="Mensaje…"
          value={input}
          disabled={!headers || loading}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (input.trim() && !loading) handleSend();
            }
          }}
        />
        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-60"
          disabled={!headers || loading || !input.trim()}
          onClick={handleSend}
          title="Enviar"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export const ChatDrawerProvider = ({ children }: { children: ReactNode }) => {
  const enabled = useAiFeature("floating_chat");
  const [open, setOpen] = useState(false);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((current) => !current), []);

  // Atajo Ctrl/Cmd+K para abrir/cerrar el chat flotante.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  const value = useMemo(
    () => ({ enabled, open: enabled && open, openDrawer, closeDrawer, toggleDrawer }),
    [enabled, open, openDrawer, closeDrawer, toggleDrawer]
  );

  return (
    <ChatDrawerContext.Provider value={value}>
      {children}
      {enabled && (
        <Drawer open={open} onClose={closeDrawer} maxWidth="max-w-md">
          {open && <ChatDrawerContent onClose={closeDrawer} />}
        </Drawer>
      )}
    </ChatDrawerContext.Provider>
  );
};

/** Lanzador para el Navbar (junto a TentativePricesChip); oculto si el flag está apagado. */
export const ChatDrawerLauncher = () => {
  const { enabled, toggleDrawer } = useChatDrawer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      onClick={toggleDrawer}
      title="Asistente IA (Ctrl/Cmd+K)"
    >
      <MessageSquareText className="h-5 w-5" aria-hidden />
      <span className="sr-only">Abrir asistente IA</span>
    </button>
  );
};
