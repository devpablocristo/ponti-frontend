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
  request_id?: string | null;
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

export type PontiDecisionStatus =
  | "open"
  | "accepted"
  | "drafted"
  | "dismissed"
  | "snoozed"
  | "resolved";

export type PontiDecisionBucket = "urgent" | "important" | "opportunity" | "follow_up";

export type PontiDecisionRun = {
  id: string;
  tenant_id: string;
  workspace: PontiWorkspaceContext;
  requested_by: string;
  status: "running" | "completed" | "degraded" | "failed" | string;
  routing_source: string;
  axis_run_id?: string;
  axis_task_id?: string;
  degraded_reason?: string;
  cards_created: number;
  cards_updated: number;
  cards_total: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
};

export type PontiDecisionAction = {
  id?: string;
  label?: string;
  capability_id?: string;
  requires_approval?: boolean;
  nexus_action_type?: string;
  payload?: Record<string, unknown>;
  missing_inputs?: string[];
};

export type PontiDecisionCard = {
  id: string;
  decision_run_id?: string;
  tenant_id: string;
  workspace: PontiWorkspaceContext;
  fingerprint: string;
  domain: string;
  route_hint: PontiRouteHint | string;
  severity: "critical" | "warning" | "info" | "opportunity" | string;
  bucket: PontiDecisionBucket | string;
  status: PontiDecisionStatus;
  title: string;
  summary: string;
  recommendation: string;
  impact_label?: string;
  impact_value?: number | null;
  source?: string;
  evidence?: Record<string, unknown>;
  tools?: PontiChatToolCall[];
  action?: PontiDecisionAction;
  axis_run_id?: string;
  axis_task_id?: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  snooze_until?: string;
  status_changed_at?: string;
  last_actor?: string;
  created_at: string;
  updated_at: string;
};

export type PontiDecisionRunResponse = {
  run: PontiDecisionRun;
  cards: PontiDecisionCard[];
};

export type PontiDecisionActionResponse = {
  status: string;
  execution_status?: string;
  action_id?: string;
  capability_id?: string;
  approval_required?: boolean;
  nexus_action_type?: string;
  side_effect_type?: string;
  write_performed?: boolean;
  draft_id?: string | null;
  nexus_request_id?: string | null;
  audit_ref?: string;
  pending_execution?: boolean;
  execution_allowed?: boolean;
  execution_blocked_by?: string;
  proposal?: Record<string, unknown>;
  missing_inputs?: string[];
  card: PontiDecisionCard;
  pending_confirmation?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
};

export type AxisCenterContext = {
  configured: boolean;
  status: "ready" | "degraded" | "unconfigured" | string;
  product_surface: string;
  agent_id: string;
  org_id?: string;
  axis_status?: number;
  business_model?: Record<string, unknown>;
  error?: unknown;
  message?: string;
};

export type AxisTask = {
  id: string;
  title: string;
  goal?: string;
  status?: string;
  priority?: string;
  summary?: string;
  channel?: string;
  context_json?: Record<string, unknown> | unknown;
  created_at?: string;
  updated_at?: string;
};

export type AxisTaskMessage = {
  id?: string;
  author_type: string;
  author_id?: string;
  body: string;
  metadata?: Record<string, unknown> | unknown;
  created_at?: string;
};

export type AxisTaskPlanStep = {
  id: string;
  title: string;
  status: string;
  tool_name?: string;
  capability?: string;
  observation?: string;
  error_message?: string;
};

export type AxisTaskPlan = {
  objective?: string;
  status?: string;
  strategy?: string;
  next_action?: string;
  blocker?: string;
  steps?: AxisTaskPlanStep[];
};

export type AxisTaskDetail = {
  task: AxisTask;
  messages: AxisTaskMessage[];
  actions?: Record<string, unknown>[];
  artifacts?: Record<string, unknown>[];
  linked_nexus_requests?: Record<string, unknown>[];
  durable_plan?: AxisTaskPlan;
  execution_plan?: Record<string, unknown>;
  execution_state?: Record<string, unknown>;
};

export type AxisChatToolCall = {
  name?: string;
  tool_call_id?: string;
  allowed?: boolean;
  decision_reason?: string;
  duration_ms?: number;
  error?: string;
  status?: string;
  result?: unknown;
};

export type AxisCenterChatResponse = {
  chat_id?: string;
  task_id?: string;
  reply: string;
  messages?: AxisTaskMessage[];
  run_id?: string;
  agent_id?: string;
  axis_run_id?: string;
  axis_task_id?: string;
  routing_source?: string;
  routed_agent?: string;
  tool_calls?: AxisChatToolCall[];
  pending_confirmations?: Record<string, unknown>[];
};

export type AxisMemoryEntry = {
  id: string;
  kind: string;
  memory_type: string;
  classification?: string;
  scope_type: string;
  scope_id: string;
  key: string;
  content_text: string;
  confidence?: number;
  trust_score?: number;
  status?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
};

export type AxisWatcher = {
  id: string;
  org_id: string;
  name: string;
  watcher_type: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  last_run_at?: string;
  last_result?: Record<string, unknown> | unknown;
  created_at?: string;
  updated_at?: string;
};

export type AxisWatcherProposal = {
  id: string;
  watcher_id: string;
  org_id?: string;
  action_type?: string;
  target_resource?: string;
  params?: Record<string, unknown>;
  reason?: string;
  nexus_request_id?: string | null;
  nexus_decision?: string | null;
  execution_status?: string;
  execution_result?: unknown;
  created_at?: string;
  resolved_at?: string | null;
};

export type AxisRunTrace = {
  run_id?: string;
  id?: string;
  org_id?: string;
  user_id?: string;
  task_id?: string;
  product_surface?: string;
  intent?: string;
  autonomy_level?: string;
  status?: string;
  tool_calls?: AxisChatToolCall[];
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  [key: string]: unknown;
};
