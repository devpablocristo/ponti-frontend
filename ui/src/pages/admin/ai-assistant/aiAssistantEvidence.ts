import type {
  PontiChatBlock,
  PontiChatPendingConfirmation,
  PontiChatToolCall,
  PontiConversationMessage,
} from "@/types/aiChat";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const firstString = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
};

export const compactLabel = (value: unknown): string => {
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

export const toolCallsFrom = (value: unknown): PontiChatToolCall[] =>
  normalizeArray(value, isChatToolCall);

export const blocksFrom = (value: unknown): PontiChatBlock[] => normalizeArray(value, isChatBlock);

export const pendingConfirmationsFrom = (value: unknown): PontiChatPendingConfirmation[] =>
  normalizeArray(value, isPendingConfirmation);

export const optionalString = (value: unknown): string | null | undefined => asString(value);

export const maybeArray = <T,>(items: T[]): T[] | undefined =>
  items.length > 0 ? items : undefined;

export const assistantMessageFromDone = (
  data: Record<string, unknown>
): PontiConversationMessage => ({
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
  request_id: optionalString(data.request_id),
});

export const blockTitle = (block: PontiChatBlock): string => {
  if (!isRecord(block)) return "Bloque";
  return firstString(block, ["title", "label", "source_ref", "source", "type"]) ?? "Bloque";
};

export const blockDetail = (block: PontiChatBlock): string | null => {
  if (!isRecord(block)) return null;
  return firstString(block, ["summary", "description", "message", "captured_at"]);
};

export const nonTextBlocks = (blocks?: PontiChatBlock[]): PontiChatBlock[] =>
  (blocks ?? []).filter((block) => {
    if (!isRecord(block)) return true;
    return firstString(block, ["type"]) !== "text";
  });

export const isFallbackRoutingSource = (source?: string | null): boolean => {
  const value = source?.trim().toLowerCase();
  return value === "legacy" || value === "read_fallback" || value === "fallback";
};

export const technicalIdsFromMessage = (
  message: PontiConversationMessage
): Array<{ label: string; value: string }> => {
  const ids = [
    { label: "request", value: message.request_id },
    { label: "run", value: message.axis_run_id ?? message.run_id },
    { label: "task", value: message.axis_task_id ?? message.task_id },
  ];
  return ids.filter((item): item is { label: string; value: string } => Boolean(item.value));
};
