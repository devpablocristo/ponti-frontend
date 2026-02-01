import { getAccessToken } from "../pages/login/context/useLocalStorage";

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
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/ask`, {
    method: "POST",
    headers: buildHeaders(headers.projectId),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error al consultar el AI Copilot Service");
  }

  return (await response.json()) as AskResponse;
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
};

export type InsightsSummary = {
  new_count_total: number;
  new_count_high_severity: number;
  top_insights: InsightItem[];
};

export const getInsightsSummary = async (
  headers: AskHeaders
): Promise<InsightsSummary> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/insights/summary`, {
    method: "GET",
    headers: buildHeaders(headers.projectId),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error al consultar summary de insights");
  }
  return (await response.json()) as InsightsSummary;
};

export const getInsights = async (
  headers: AskHeaders,
  entityType: string,
  entityId: string
): Promise<{ insights: InsightItem[] }> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/insights/${entityType}/${entityId}`,
    {
      method: "GET",
      headers: buildHeaders(headers.projectId),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error al consultar insights");
  }
  return (await response.json()) as { insights: InsightItem[] };
};

export const computeInsights = async (headers: AskHeaders): Promise<void> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/insights/compute`, {
    method: "POST",
    headers: buildHeaders(headers.projectId),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error al recomputar insights");
  }
};
