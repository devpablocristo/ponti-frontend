/** Contratos del asistente conversacional Ponti. El BFF conserva este shape y el backend lo adapta a Axis Companion. */

export type PontiRouteHint =
  | "general"
  | "dashboard"
  | "labors"
  | "supplies"
  | "campaigns"
  | "lots"
  | "stock"
  | "reports";

type PontiWorkspaceContext = {
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

/** Evento SSE de POST .../chat/stream. El backend puede sintetizar SSE sobre una respuesta síncrona de Companion. */
export type PontiChatStreamSseEvent = {
  event: string;
  data: Record<string, unknown>;
};
