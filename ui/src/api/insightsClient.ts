import { request } from "@devpablocristo/platform-http/fetch";
import { getAccessToken } from "@/pages/login/context/useLocalStorage";

export type InsightItem = {
  id: string;
  kind: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  status: string;
  title: string;
  body: string;
  evidence?: Record<string, unknown>;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_notified_at?: string;
  resolved_at?: string;
  read_at?: string;
};

export type InsightsListResponse = {
  items: InsightItem[];
};

export type ListInsightsOptions = {
  limit?: number;
  includeResolved?: boolean;
};

const getBaseUrl = (): string => "/api/v1";

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("ponti:tenant_id") ||
    window.localStorage.getItem("tenant_id") ||
    ""
  ).trim();
}

const buildHeaders = (projectId?: string): Record<string, string> => {
  const token = getAccessToken();
  const tenantId = getTenantId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (projectId) headers["X-Project-Id"] = projectId;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

export const listInsights = async (
  projectId?: string,
  opts: ListInsightsOptions = {},
): Promise<InsightsListResponse> => {
  const qs = new URLSearchParams();
  qs.set("limit", String(opts.limit ?? 100));
  if (opts.includeResolved) qs.set("include_resolved", "true");
  return request<InsightsListResponse>(`/insights?${qs.toString()}`, {
    method: "GET",
    headers: buildHeaders(projectId),
    baseURLs: [getBaseUrl()],
  });
};

const callAction = async (
  insightId: string,
  action: "read" | "resolve",
  method: "POST" | "DELETE",
  projectId?: string,
): Promise<void> => {
  await request<void>(`/insights/${encodeURIComponent(insightId)}/${action}`, {
    method,
    headers: buildHeaders(projectId),
    baseURLs: [getBaseUrl()],
  });
};

export const markInsightRead = (id: string, projectId?: string) =>
  callAction(id, "read", "POST", projectId);
export const markInsightUnread = (id: string, projectId?: string) =>
  callAction(id, "read", "DELETE", projectId);
export const resolveInsight = (id: string, projectId?: string) =>
  callAction(id, "resolve", "POST", projectId);
export const reopenInsight = (id: string, projectId?: string) =>
  callAction(id, "resolve", "DELETE", projectId);
