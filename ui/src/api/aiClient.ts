import { request } from "@devpablocristo/core-http/fetch";
import { getAccessToken } from "@/pages/login/context/useLocalStorage";
import type {
  PontiChatRequest,
  PontiChatResponse,
  PontiChatStreamSseEvent,
  AxisCenterChatResponse,
  AxisCenterContext,
  AxisMemoryEntry,
  AxisRunTrace,
  AxisTask,
  AxisTaskDetail,
  AxisWatcher,
  AxisWatcherProposal,
  PontiConversationDetail,
  PontiConversationSummary,
  PontiDecisionActionResponse,
  PontiDecisionCard,
  PontiDecisionRun,
  PontiDecisionRunResponse,
  PontiDecisionStatus,
  PontiRouteHint,
  PontiWorkspaceContext,
} from "@/types/aiChat";

type AskHeaders = {
  projectId: string;
};

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  return url && url.length > 0 ? url : "/api/v1/ai";
};

const buildHeaders = (projectId: string): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-PROJECT-ID": projectId,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export async function pontiAssistantChat(
  payload: PontiChatRequest,
  headers: AskHeaders
): Promise<PontiChatResponse> {
  return request<PontiChatResponse>("/chat", {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

function parseSseBlocks(buffer: string): { events: PontiChatStreamSseEvent[]; rest: string } {
  const events: PontiChatStreamSseEvent[] = [];
  const lastSep = buffer.lastIndexOf("\n\n");
  if (lastSep === -1) {
    return { events, rest: buffer };
  }
  const complete = buffer.slice(0, lastSep);
  const rest = buffer.slice(lastSep + 2);
  for (const block of complete.split("\n\n")) {
    if (!block.trim()) continue;
    let ev = "message";
    const dataParts: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        ev = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataParts.push(line.slice(5).trimStart());
      }
    }
    const raw = dataParts.join("\n");
    try {
      const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      events.push({ event: ev, data });
    } catch {
      events.push({ event: "error", data: { message: "sse_parse_error", detail: raw } });
    }
  }
  return { events, rest };
}

/**
 * Chat con streaming SSE vía BFF (`/chat/stream`).
 * `onEvent` recibe cada evento parseado (`start`, `text`, `tool_call`, `tool_result`, `done`, `error`).
 */
export async function pontiAssistantChatStream(
  payload: PontiChatRequest,
  headers: AskHeaders,
  onEvent: (ev: PontiChatStreamSseEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getAccessToken();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "X-PROJECT-ID": headers.projectId,
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  const base = getBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/chat/stream`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `chat stream failed: ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("chat stream: no body");
  }
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseBlocks(buf);
    buf = rest;
    for (const e of events) {
      onEvent(e);
    }
  }
  if (buf.trim()) {
    const { events } = parseSseBlocks(buf + "\n\n");
    for (const e of events) {
      onEvent(e);
    }
  }
}

export async function listPontiChatConversations(
  headers: AskHeaders,
  limit = 50
): Promise<{ items: PontiConversationSummary[] }> {
  return request<{ items: PontiConversationSummary[] }>(
    `/chat/conversations?limit=${limit}`,
    {
      method: "GET",
      headers: buildHeaders(headers.projectId),
      baseURLs: [getBaseUrl()],
    }
  );
}

export async function getPontiChatConversation(
  conversationId: string,
  headers: AskHeaders
): Promise<PontiConversationDetail> {
  return request<PontiConversationDetail>(`/chat/conversations/${conversationId}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export type PontiDecisionCardQuery = {
  route_hint?: PontiRouteHint | string;
  domain?: string;
  bucket?: string;
  status?: PontiDecisionStatus;
  include_resolved?: boolean;
  limit?: number;
};

const decisionQueryString = (query: PontiDecisionCardQuery): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const out = params.toString();
  return out ? `?${out}` : "";
};

export async function createPontiDecisionRun(
  payload: { workspace: PontiWorkspaceContext; route_hint?: PontiRouteHint | string },
  headers: AskHeaders
): Promise<PontiDecisionRunResponse> {
  return request<PontiDecisionRunResponse>("/decision-runs", {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function listPontiDecisionRuns(
  headers: AskHeaders,
  limit = 25
): Promise<{ items: PontiDecisionRun[] }> {
  return request<{ items: PontiDecisionRun[] }>(`/decision-runs?limit=${limit}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function listPontiDecisionCards(
  headers: AskHeaders,
  query: PontiDecisionCardQuery = {}
): Promise<{ items: PontiDecisionCard[] }> {
  return request<{ items: PontiDecisionCard[] }>(`/decision-cards${decisionQueryString(query)}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function patchPontiDecisionCard(
  cardId: string,
  payload: { status: PontiDecisionStatus; snooze_until?: string },
  headers: AskHeaders
): Promise<PontiDecisionCard> {
  return request<PontiDecisionCard>(`/decision-cards/${cardId}`, {
    method: "PATCH",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function executePontiDecisionCardAction(
  cardId: string,
  actionId: string,
  headers: AskHeaders
): Promise<PontiDecisionActionResponse> {
  return request<PontiDecisionActionResponse>(`/decision-cards/${cardId}/actions/${actionId}`, {
    method: "POST",
    body: {},
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

const axisPath = (path: string): string => `/axis${path.startsWith("/") ? path : `/${path}`}`;

export async function getAxisCenterContext(headers: AskHeaders): Promise<AxisCenterContext> {
  return request<AxisCenterContext>(axisPath("/context"), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function axisCenterChat(
  payload: PontiChatRequest & { task_id?: string | null; agent_id?: string | null },
  headers: AskHeaders
): Promise<AxisCenterChatResponse> {
  return request<AxisCenterChatResponse>(axisPath("/chat"), {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function listAxisTasks(headers: AskHeaders, limit = 50): Promise<{ data?: AxisTask[]; items?: AxisTask[] }> {
  return request<{ data?: AxisTask[]; items?: AxisTask[] }>(axisPath(`/tasks?limit=${limit}`), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function getAxisTask(taskId: string, headers: AskHeaders): Promise<AxisTaskDetail> {
  return request<AxisTaskDetail>(axisPath(`/tasks/${taskId}`), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function getAxisTaskGraph(
  taskId: string,
  headers: AskHeaders
): Promise<{ events?: Record<string, unknown>[]; data?: Record<string, unknown>[] }> {
  return request<{ events?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>(
    axisPath(`/tasks/${taskId}/graph`),
    {
      method: "GET",
      headers: buildHeaders(headers.projectId),
      baseURLs: [getBaseUrl()],
    }
  );
}

export async function listAxisMemory(
  headers: AskHeaders,
  query: { scope_type?: string; kind?: string; q?: string; limit?: number } = {}
): Promise<{ entries?: AxisMemoryEntry[]; results?: Array<{ entry: AxisMemoryEntry; score?: number }>; scope?: Record<string, string> }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<{ entries?: AxisMemoryEntry[]; results?: Array<{ entry: AxisMemoryEntry; score?: number }>; scope?: Record<string, string> }>(
    axisPath(`/memory${suffix}`),
    {
      method: "GET",
      headers: buildHeaders(headers.projectId),
      baseURLs: [getBaseUrl()],
    }
  );
}

export async function createAxisMemory(
  payload: {
    content_text: string;
    kind?: string;
    memory_type?: string;
    scope_type?: string;
    workspace?: PontiWorkspaceContext;
    confirmed: true;
  },
  headers: AskHeaders
): Promise<AxisMemoryEntry & { scope?: Record<string, string> }> {
  return request<AxisMemoryEntry & { scope?: Record<string, string> }>(axisPath("/memory"), {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function listAxisWatchers(
  headers: AskHeaders
): Promise<{ watchers?: AxisWatcher[]; org_id?: string }> {
  return request<{ watchers?: AxisWatcher[]; org_id?: string }>(axisPath("/watchers"), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function ensurePontiAxisWatchers(
  payload: { workspace: PontiWorkspaceContext },
  headers: AskHeaders
): Promise<{ created?: AxisWatcher[]; existing?: AxisWatcher[]; org_id?: string }> {
  return request<{ created?: AxisWatcher[]; existing?: AxisWatcher[]; org_id?: string }>(
    axisPath("/watchers/ensure-ponti"),
    {
      method: "POST",
      body: payload,
      headers: buildHeaders(headers.projectId),
      baseURLs: [getBaseUrl()],
    }
  );
}

export async function runAxisWatcher(
  watcherId: string,
  payload: { workspace: PontiWorkspaceContext },
  headers: AskHeaders
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(axisPath(`/watchers/${watcherId}/run`), {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function listAxisWatcherProposals(
  watcherId: string,
  headers: AskHeaders
): Promise<{ proposals?: AxisWatcherProposal[] }> {
  return request<{ proposals?: AxisWatcherProposal[] }>(axisPath(`/watchers/${watcherId}/proposals`), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}

export async function syncAxisWatcherProposals(
  watcherId: string,
  payload: { workspace: PontiWorkspaceContext },
  headers: AskHeaders
): Promise<{ proposals?: AxisWatcherProposal[]; cards?: PontiDecisionCard[] }> {
  return request<{ proposals?: AxisWatcherProposal[]; cards?: PontiDecisionCard[] }>(
    axisPath(`/watchers/${watcherId}/sync-proposals`),
    {
      method: "POST",
      body: payload,
      headers: buildHeaders(headers.projectId),
      baseURLs: [getBaseUrl()],
    }
  );
}

export async function listAxisRunTraces(
  headers: AskHeaders,
  query: { task_id?: string; limit?: number } = {}
): Promise<{ traces?: AxisRunTrace[] }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<{ traces?: AxisRunTrace[] }>(axisPath(`/traces${suffix}`), {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
}
