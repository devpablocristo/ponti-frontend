import { request } from "@devpablocristo/core-http/fetch";
import { getAccessToken } from "@/lib/authStorage";
import type {
  PontiChatRequest,
  PontiChatStreamSseEvent,
  PontiConversationDetail,
  PontiConversationSummary,
} from "@/types/aiChat";

type AskHeaders = {
  projectId: string;
};

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  return url && url.length > 0 ? url : "/api/v1/ai";
};

const getTenantId = (): string => {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("ponti:tenant_id") ||
    window.localStorage.getItem("tenant_id") ||
    ""
  );
};

const buildHeaders = (projectId: string): Record<string, string> => {
  const token = getAccessToken();
  const tenantId = getTenantId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-PROJECT-ID": projectId,
  };
  if (tenantId) {
    headers["X-TENANT-ID"] = tenantId;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

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
  const tenantId = getTenantId();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "X-PROJECT-ID": headers.projectId,
  };
  if (tenantId) {
    h["X-TENANT-ID"] = tenantId;
  }
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
