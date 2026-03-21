import { request } from "@devpablocristo/core-http/fetch";
import { getAccessToken } from "@/pages/login/context/useLocalStorage";

export type AskRequest = {
  question: string;
  context?: {
    date_from?: string;
    date_to?: string;
  };
};

export type AskResponse = {
  request_id: string;
  intent: string;
  query_id: string | null;
  params: Record<string, unknown>;
  data: Record<string, unknown>[];
  answer: string;
  sources: Array<Record<string, unknown>>;
  warnings: string[];
  related_insights_count: number;
  related_insights: RelatedInsight[];
};

export type RelatedInsight = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
};

type AskHeaders = {
  projectId: string;
};

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  return url && url.length > 0 ? url : "/api/ai";
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

export const askAICopilot = async (
  payload: AskRequest,
  headers: AskHeaders
): Promise<AskResponse> => {
  return request<AskResponse>("/ask", {
    method: "POST",
    body: payload,
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
};

export type InsightItem = {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  severity: number;
  priority: number;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  explanations: Record<string, unknown>;
  action: Record<string, unknown>;
  model_version: string;
  features_version: string;
  computed_at: string;
  valid_until: string;
  status: string;
  impact_min?: number | null;
  impact_max?: number | null;
  impact_unit?: string | null;
  confidence?: string | null;
  dedupe_key?: string | null;
  cooldown_until?: string | null;
  computed_by?: string | null;
  job_run_id?: string | null;
  rules_version?: string | null;
};

export type InsightsSummary = {
  new_count_total: number;
  new_count_high_severity: number;
  top_insights: InsightItem[];
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
): Promise<{ insights: InsightItem[] }> => {
  return request<{ insights: InsightItem[] }>(`/insights/${entityType}/${entityId}`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
    baseURLs: [getBaseUrl()],
  });
};

export type ComputeInsightsResult = {
  request_id: string;
  computed: number;
  insights_created: number;
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
