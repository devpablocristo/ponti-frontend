/** Contratos del asistente conversacional Ponti (legacy ponti-ai o Axis via BFF). */

export type PontiRouteHint =
  | "general"
  | "dashboard"
  | "labors"
  | "supplies"
  | "campaigns"
  | "lots"
  | "stock"
  | "reports";

export type PontiWorkspaceContext = {
  customer_id?: number | null;
  customer_name?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  campaign_id?: number | null;
  campaign_name?: string | null;
  field_id?: number | null;
  field_name?: string | null;
};

export type PontiChatRequest = {
  message: string;
  chat_id?: string | null;
  route_hint?: PontiRouteHint | null;
  preferred_language?: "es" | "en";
  confirmed_actions?: string[];
  workspace?: PontiWorkspaceContext | null;
};

export type PontiChatTextBlock = { type: "text"; text: string };

export type PontiChatBlock = PontiChatTextBlock | Record<string, unknown>;

export type PontiChatToolCall = string | Record<string, unknown>;

export type PontiChatPendingConfirmation = string | Record<string, unknown>;

export type PontiChatResponse = {
  request_id: string;
  output_kind: string;
  content_language: "es" | "en";
  chat_id: string;
  reply: string;
  tokens_used: number;
  tool_calls: PontiChatToolCall[];
  pending_confirmations: PontiChatPendingConfirmation[];
  blocks: PontiChatBlock[];
  routed_agent: string;
  routing_source: string;
  axis_run_id?: string;
  axis_task_id?: string;
  run_id?: string;
  task_id?: string;
  agent_id?: string;
};

export type PontiConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type PontiConversationMessage = {
  role: string;
  content: string;
  ts?: string | null;
  tool_calls?: PontiChatToolCall[];
  pending_confirmations?: PontiChatPendingConfirmation[];
  blocks?: PontiChatBlock[];
  routed_agent?: string | null;
  routing_source?: string | null;
  axis_run_id?: string | null;
  axis_task_id?: string | null;
  run_id?: string | null;
  task_id?: string | null;
};

export type PontiConversationDetail = {
  id: string;
  title: string;
  messages: PontiConversationMessage[];
  created_at: string;
  updated_at: string;
};

/** Evento SSE de POST .../chat/stream (misma forma que emite sse-starlette / ponti-ai). */
export type PontiChatStreamSseEvent = {
  event: string;
  data: Record<string, unknown>;
};
