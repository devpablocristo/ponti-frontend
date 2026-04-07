import { request } from "@devpablocristo/core-http/fetch";
import { getAccessToken } from "@/pages/login/context/useLocalStorage";
import type {
  ComputeInsightsResult,
  CopilotMode,
  PontiInsightListResponse,
  InsightsSummary,
  PontiCopilotResponse,
} from "@/types/ai";
import type {
  PontiChatRequest,
  PontiChatResponse,
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

export type {
  ComputeInsightsResult,
  CopilotMode,
  InsightItem,
  PontiCopilotOutputKind,
  PontiInsightListResponse,
  PontiInsightServiceKind,
  PontiRoutedAgent,
  PontiRoutingSource,
  PontiSummaryOutputKind,
  InsightsSummary,
  PontiCopilotResponse,
} from "@/types/ai";

export const askAICopilot = async (
  insightId: string,
  mode: CopilotMode,
  headers: AskHeaders
): Promise<PontiCopilotResponse> => {
  return request<PontiCopilotResponse>(`/copilot/insights/${insightId}/${mode}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
};

export const getInsightsSummary = async (
  headers: AskHeaders
): Promise<InsightsSummary> => {
  return request<InsightsSummary>("/insights/summary", {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
};

export const getInsights = async (
  headers: AskHeaders,
  entityType: string,
  entityId: string
): Promise<PontiInsightListResponse> => {
  return request<PontiInsightListResponse>(`/insights/${entityType}/${entityId}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
};

export const computeInsights = async (
  headers: AskHeaders
): Promise<ComputeInsightsResult> => {
  return request<ComputeInsightsResult>("/insights/compute", {
    method: "POST",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
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
