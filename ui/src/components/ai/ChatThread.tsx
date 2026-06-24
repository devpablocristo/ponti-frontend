import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  blockDetail,
  blockTitle,
  compactLabel,
  firstString,
  isRecord,
  nonTextBlocks,
} from "@/pages/admin/ai-assistant/aiAssistantEvidence";
import PendingConfirmationsPanel from "@/components/ai/PendingConfirmationsPanel";
import type { AiChatStreamDraft } from "@/hooks/useAiChatSession";
import type { PontiConversationMessage } from "@/types/aiChat";

const MARKDOWN_CLASS =
  "prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:rounded prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-table:text-xs prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-gray-300 prose-td:px-2 prose-td:py-1 prose-headings:mb-1 prose-headings:mt-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0";

const AssistantMarkdown = ({ content }: { content: string }) => (
  <div className={MARKDOWN_CLASS}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

const AssistantEvidence = ({
  message,
  onShowEvidence,
  onConfirmPending,
  confirmDisabled,
}: {
  message: PontiConversationMessage;
  onShowEvidence?: (message: PontiConversationMessage) => void;
  onConfirmPending?: (id: string) => Promise<boolean>;
  confirmDisabled?: boolean;
}) => {
  const tools = message.tool_calls ?? [];
  const blocks = nonTextBlocks(message.blocks);
  const pending = message.pending_confirmations ?? [];
  const source = message.routing_source ?? message.routed_agent;
  const runID = message.axis_run_id ?? message.run_id;
  const taskID = message.axis_task_id ?? message.task_id;

  if (tools.length === 0 && blocks.length === 0 && pending.length === 0 && !source && !runID && !taskID) {
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
        {runID && (
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-500">
            run {runID.slice(0, 8)}
          </span>
        )}
        {taskID && (
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-500">
            task {taskID.slice(0, 8)}
          </span>
        )}
        {onShowEvidence && (
          <button
            type="button"
            className="ml-auto text-[11px] font-medium text-primary-700 hover:underline"
            onClick={() => onShowEvidence(message)}
          >
            Ver evidencia
          </button>
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
        <PendingConfirmationsPanel items={pending} onConfirm={onConfirmPending} disabled={confirmDisabled} />
      )}
    </div>
  );
};

export type ChatThreadProps = {
  messages: PontiConversationMessage[];
  streamDraft: AiChatStreamDraft | null;
  loading: boolean;
  emptyState?: ReactNode;
  onShowEvidence?: (message: PontiConversationMessage) => void;
  /** Confirmación de pending_confirmations (flag chat_confirmations). */
  onConfirmPending?: (id: string) => Promise<boolean>;
  className?: string;
};

const ChatThread = ({
  messages,
  streamDraft,
  loading,
  emptyState,
  onShowEvidence,
  onConfirmPending,
  className = "flex-1 space-y-3 overflow-y-auto px-4 py-3",
}: ChatThreadProps) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamDraft]);

  return (
    <div className={className}>
      {messages.length === 0 && emptyState}
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
              <AssistantEvidence
                message={m}
                onShowEvidence={onShowEvidence}
                onConfirmPending={onConfirmPending}
                confirmDisabled={loading}
              />
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
  );
};

export default ChatThread;
