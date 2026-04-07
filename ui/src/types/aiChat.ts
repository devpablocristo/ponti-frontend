/** Contratos del asistente conversacional Ponti (POST /v1/chat en ponti-ai vía BFF). */

export type PontiRouteHint =
  | "general"
  | "dashboard"
  | "labors"
  | "supplies"
  | "campaigns"
  | "lots"
  | "stock"
  | "reports"
  | "copilot";

export type PontiChatRequest = {
  message: string;
  chat_id?: string | null;
  route_hint?: PontiRouteHint | null;
  preferred_language?: "es" | "en";
  confirmed_actions?: string[];
};

export type PontiChatTextBlock = { type: "text"; text: string };

export type PontiChatBlock = PontiChatTextBlock | Record<string, unknown>;

export type PontiChatResponse = {
  request_id: string;
  output_kind: string;
  content_language: "es" | "en";
  chat_id: string;
  reply: string;
  tokens_used: number;
  tool_calls: string[];
  pending_confirmations: string[];
  blocks: PontiChatBlock[];
  routed_agent: string;
  routing_source: string;
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
  tool_calls?: string[];
};

export type PontiConversationDetail = {
  id: string;
  title: string;
  messages: PontiConversationMessage[];
  created_at: string;
  updated_at: string;
};
