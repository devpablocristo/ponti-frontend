import axios, { isAxiosError } from "axios";
import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { proxyManagerChatStreamPost } from "../lib/managerChatStreamProxy";
import { requestContext } from "../requestContext";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

type AxisMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const axisScopes = [
  "companion:tasks:read",
  "companion:tasks:write",
  "companion:connectors:execute",
  "companion:watchers:read",
  "companion:watchers:write",
  "companion:watchers:execute",
  "companion:memory:read",
  "companion:memory:write",
  "companion:memory:admin",
  "companion:agents:read",
  "companion:agents:admin",
  "companion:runtime:admin",
  "companion:observability:read",
  "companion:cross_org",
].join(" ");

const axisConfigured = (): boolean =>
  Boolean(configService.axisCompanionBaseUrl && configService.axisCompanionApiKey);

const axisBaseUrl = (): string => configService.axisCompanionBaseUrl.replace(/\/$/, "");

const bodyRecord = (req: Request): Record<string, any> => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body as Record<string, any>;
  }
  return {};
};

const getAxisOrgId = (req: Request): string => {
  const direct = req.headers["x-axis-org-id"] || req.headers["x-org-id"];
  if (typeof direct === "string" && direct.trim() !== "") return direct.trim();
  const queryOrg = req.query.org_id;
  if (typeof queryOrg === "string" && queryOrg.trim() !== "") return queryOrg.trim();
  const body = bodyRecord(req);
  const workspace = body.workspace && typeof body.workspace === "object" ? body.workspace : {};
  for (const value of [body.org_id, body.tenant_id, workspace.tenant_id]) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return configService.axisCompanionOrgId.trim();
};

const axisHeaders = (req: Request, userId: string, orgId?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": configService.axisCompanionApiKey,
    "X-User-ID": userId,
    "X-On-Behalf-Of": userId,
    "X-Actor-Type": "human",
    "X-Product-Surface": configService.axisProductSurface,
    "X-Auth-Scopes": axisScopes,
  };
  const resolvedOrg = orgId || getAxisOrgId(req);
  if (resolvedOrg) {
    headers["X-Org-ID"] = resolvedOrg;
  }
  return headers;
};

const axisProxyError = (message: string, status = 503, details?: Record<string, unknown>) => ({
  success: false,
  message,
  error: {
    status,
    details: details ? JSON.stringify(details) : message,
  },
});

const callAxis = async <T = any>(
  req: Request,
  userId: string,
  method: AxisMethod,
  path: string,
  body?: any,
  orgId?: string
): Promise<{ status: number; data: T }> => {
  if (!axisConfigured()) {
    return {
      status: 503,
      data: axisProxyError("Axis Companion no configurado") as T,
    };
  }
  const response = await axios.request<T>({
    baseURL: axisBaseUrl(),
    url: path,
    method,
    data: body,
    timeout: configService.axisCompanionTimeoutMs,
    validateStatus: () => true,
    headers: axisHeaders(req, userId, orgId),
  });
  return { status: response.status, data: response.data };
};

const resolveAxisOrgId = async (req: Request, userId: string): Promise<string> => {
  const configured = getAxisOrgId(req);
  if (configured) return configured;
  const { status, data } = await callAxis<Record<string, any>>(
    req,
    userId,
    "GET",
    "/v1/business-model"
  );
  if (status < 400 && typeof data?.org_id === "string" && data.org_id.trim() !== "") {
    return data.org_id.trim();
  }
  return "";
};

const axisScope = async (req: Request, userId: string): Promise<{ scopeType: string; scopeId: string }> => {
  const body = bodyRecord(req);
  const scopeType = String(req.query.scope_type || body.scope_type || "org").trim();
  const provided = String(req.query.scope_id || body.scope_id || "").trim();
  if (provided) {
    return { scopeType, scopeId: provided };
  }
  const orgId = await resolveAxisOrgId(req, userId);
  if (!orgId) {
    return { scopeType, scopeId: "" };
  }
  if (scopeType === "user") {
    return { scopeType, scopeId: `${orgId}:${userId}` };
  }
  return { scopeType: "org", scopeId: orgId };
};

const stableMemoryKey = (content: string, kind: string, scopeType: string): string => {
  const slug = content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${scopeType}:${kind}:${slug || Date.now()}`;
};

const normalizeAxisChat = (data: any) => {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    routing_source: data.routing_source || "axis",
    routed_agent: data.routed_agent || data.agent_id || configService.axisDefaultAgentId,
    axis_run_id: data.axis_run_id || data.run_id || "",
    axis_task_id: data.axis_task_id || data.task_id || "",
  };
};

const watcherDefaults = (workspace: Record<string, any>, orgId: string) => {
  const basePayload = { workspace, limit: 50 };
  const itemPath = "items";
  return [
    {
      name: `Ponti · insights críticos · ${workspace.project_name || workspace.project_id || orgId}`,
      watcher_type: "capability",
      enabled: true,
      config: {
        product_surface: "ponti",
        connector_kind: "ponti",
        query_operation: "ponti.insights.list",
        query_payload: { ...basePayload, include_resolved: false },
        result_items_path: itemPath,
        condition: { path: "severity", operator: "non_empty" },
        action_type: "ponti.axis.propose.insight_resolution",
        proposal_only: true,
      },
    },
    {
      name: `Ponti · stock a revisar · ${workspace.project_name || workspace.project_id || orgId}`,
      watcher_type: "capability",
      enabled: true,
      config: {
        product_surface: "ponti",
        connector_kind: "ponti",
        query_operation: "ponti.stock.summary",
        query_payload: basePayload,
        result_items_path: itemPath,
        condition: { path: "id", operator: "exists" },
        action_type: "ponti.axis.propose.stock_count",
        proposal_only: true,
      },
    },
    {
      name: `Ponti · labores problemáticas · ${workspace.project_name || workspace.project_id || orgId}`,
      watcher_type: "capability",
      enabled: true,
      config: {
        product_surface: "ponti",
        connector_kind: "ponti",
        query_operation: "ponti.workorders.list",
        query_payload: basePayload,
        result_items_path: itemPath,
        condition: { path: "status", operator: "non_empty" },
        action_type: "ponti.axis.propose.workorder_draft",
        proposal_only: true,
      },
    },
    {
      name: `Ponti · reportes económicos · ${workspace.project_name || workspace.project_id || orgId}`,
      watcher_type: "capability",
      enabled: true,
      config: {
        product_surface: "ponti",
        connector_kind: "ponti",
        query_operation: "ponti.reports.summary_results.summary",
        query_payload: basePayload,
        result_items_path: itemPath,
        condition: { path: "id", operator: "exists" },
        action_type: "ponti.axis.propose.report_review",
        proposal_only: true,
      },
    },
  ].map((watcher) => ({ ...watcher, org_id: orgId }));
};

const proposalToDecisionPayload = (
  proposal: Record<string, any>,
  watcher: Record<string, any>,
  workspace: Record<string, any>
) => {
  const params = proposal.params && typeof proposal.params === "object" ? proposal.params : {};
  const title = params.item_name || proposal.reason || watcher.name || "Propuesta Axis";
  const actionType = String(proposal.action_type || "");
  const domain = actionType.includes("stock")
    ? "stock"
    : actionType.includes("workorder")
      ? "workorders"
      : actionType.includes("report")
        ? "reports"
        : actionType.includes("insight")
          ? "insights"
          : "axis";
  const routeHint =
    domain === "workorders" ? "labors" : domain === "axis" || domain === "insights" ? "dashboard" : domain;
  return {
    workspace,
    fingerprint: `axis:watcher:${proposal.id || proposal.target_resource || title}`,
    domain,
    route_hint: routeHint,
    severity: proposal.execution_status === "failed" ? "warning" : "info",
    bucket: proposal.execution_status === "pending" ? "important" : "follow_up",
    title: String(title),
    summary: String(proposal.reason || `Axis generó una propuesta desde ${watcher.name || "watcher"}.`),
    recommendation: "Revisar la evidencia y continuar la investigación en Centro Axis antes de crear borradores.",
    source: "axis.watcher",
    evidence: {
      source: "axis.watcher",
      watcher_id: watcher.id,
      watcher_name: watcher.name,
      proposal,
      params,
    },
    tools: [{ name: watcher.config?.query_operation || "axis.watcher", status: "success", source: "axis" }],
    axis_run_id: "",
    axis_task_id: "",
  };
};

/** Resumen seguro para logs / JSON con verbose (sin headers, body ni API keys). */
const summarizeProxyError = (error: unknown): Record<string, string | number | undefined> => {
  if (isAxiosError(error)) {
    return {
      kind: "axios",
      message: error.message,
      code: error.code,
      responseStatus: error.response?.status,
    };
  }
  if (error instanceof Error) {
    return {
      kind: "error",
      name: error.name,
      message: error.message,
      code: (error as NodeJS.ErrnoException).code,
    };
  }
  return { kind: "unknown", message: String(error) };
};

type HandleErrorOptions = {
  /** Texto extra solo si configService.bffVerboseErrors (BFF_VERBOSE_ERRORS); nunca secretos. */
  devDetails?: string;
};

const getProjectId = (req: Request): string | null => {
  const header = req.headers["x-project-id"];
  if (typeof header === "string" && header.trim() !== "") {
    return header.trim();
  }
  return null;
};

const buildHeaders = (userId: string, projectId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
  "X-Project-Id": projectId,
});

const requireUser = (req: Request, res: Response): string | null => {
  const userId = req.user?.userID;
  if (!userId) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return null;
  }
  return userId;
};

const requireProject = (req: Request, res: Response): string | null => {
  const projectId = getProjectId(req);
  if (!projectId) {
    res.status(400).json({ message: "Proyecto obligatorio" });
    return null;
  }
  return projectId;
};

const buildQueryString = (query: Request["query"]): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim() !== "") {
          params.append(key, item);
        }
      }
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") {
      params.set(key, value);
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const handleError = (res: Response, error: unknown, opts?: HandleErrorOptions) => {
  const err = error as ApiResponse<null>;
  if (err && typeof err === "object" && "error" in err) {
    res.status(err.error?.status || 500).json(err);
    return;
  }
  const details =
    opts?.devDetails && configService.bffVerboseErrors
      ? opts.devDetails
      : "No se pudo procesar la solicitud";
  res.status(500).json({
    success: false,
    message: "Error inesperado",
    error: { status: 500, details },
  });
};

// --- Configuración IA para el FE (flags por entorno, sin secretos) ---

router.get("/config", (_req: Request, res: Response) => {
  res.status(200).json({
    features: configService.pontiAiFeatures,
    badge_poll_ms: configService.aiBadgePollMs,
    product_surface: configService.axisProductSurface,
  });
});

// --- Asistente conversacional (proxy a ponti-backend → ponti-ai) ---

router.post("/chat", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/chat", req.body, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/chat/stream", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    await proxyManagerChatStreamPost(req, res, {
      managerBaseUrl: configService.baseManagerApi,
      path: "/ai/chat/stream",
      apiKey: configService.apiKey,
      userId,
      projectId,
      jsonBody: req.body,
      authorization: requestContext.getAuthorization(),
    });
  } catch (error: unknown) {
    const summary = summarizeProxyError(error);
    console.error("[BFF] POST ai/chat/stream proxy failed", summary);
    if (!res.headersSent) {
      handleError(res, error, { devDetails: JSON.stringify(summary) });
    } else {
      try {
        res.destroy(error instanceof Error ? error : undefined);
      } catch {
        /* noop */
      }
    }
  }
});

router.get("/chat/conversations", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit.trim() : "";
    const limit = limitRaw ? `?limit=${encodeURIComponent(limitRaw)}` : "";
    const { data } = await apiClient.get<any>(`/ai/chat/conversations${limit}`, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/chat/conversations/:conversation_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { conversation_id } = req.params;
    const { data } = await apiClient.get<any>(
      `/ai/chat/conversations/${encodeURIComponent(conversation_id)}`,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

// --- Agente operativo / decisiones IA (proxy a ponti-backend) ---

router.post("/decision-runs", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/decision-runs", req.body, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/decision-runs", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.get<any>(`/ai/decision-runs${buildQueryString(req.query)}`, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/decision-cards", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.get<any>(`/ai/decision-cards${buildQueryString(req.query)}`, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/decision-cards/:card_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { card_id } = req.params;
    const { data } = await apiClient.patch<any>(
      `/ai/decision-cards/${encodeURIComponent(card_id)}`,
      req.body,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/decision-cards/:card_id/actions/:action_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { card_id, action_id } = req.params;
    const { data } = await apiClient.post<any>(
      `/ai/decision-cards/${encodeURIComponent(card_id)}/actions/${encodeURIComponent(action_id)}`,
      req.body,
      headers
    );
    res.status(202).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

// --- Inbox de aprobaciones Nexus (proxy a ponti-backend; lectura Ola A, decisión Ola B) ---

router.get("/approvals", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.get<any>(`/ai/approvals${buildQueryString(req.query)}`, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/approvals/summary", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.get<any>("/ai/approvals/summary", headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/approvals/:request_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { request_id } = req.params;
    const { data } = await apiClient.get<any>(
      `/ai/approvals/${encodeURIComponent(request_id)}`,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/approvals/:request_id/evidence", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { request_id } = req.params;
    const { data } = await apiClient.get<any>(
      `/ai/approvals/${encodeURIComponent(request_id)}/evidence`,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    // handleError propaga el status real del core (409 SoD, 403, 404, 410).
    handleError(res, error);
  }
});

router.post("/approvals/:request_id/approve", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { request_id } = req.params;
    const { data } = await apiClient.post<any>(
      `/ai/approvals/${encodeURIComponent(request_id)}/approve`,
      req.body,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/approvals/:request_id/reject", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { request_id } = req.params;
    const { data } = await apiClient.post<any>(
      `/ai/approvals/${encodeURIComponent(request_id)}/reject`,
      req.body,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

// --- Centro Axis: proxy seguro BFF -> Axis Companion ---

router.get("/axis/context", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  if (!axisConfigured()) {
    res.status(200).json({
      configured: false,
      status: "unconfigured",
      product_surface: configService.axisProductSurface,
      agent_id: configService.axisDefaultAgentId,
      message: "Axis Companion no configurado en el BFF",
    });
    return;
  }

  try {
    const { status, data } = await callAxis<Record<string, any>>(req, userId, "GET", "/v1/business-model");
    res.status(200).json({
      configured: true,
      status: status < 400 ? "ready" : "degraded",
      product_surface: configService.axisProductSurface,
      agent_id: configService.axisDefaultAgentId,
      org_id: typeof data?.org_id === "string" ? data.org_id : getAxisOrgId(req),
      business_model: status < 400 ? data : undefined,
      axis_status: status,
      error: status >= 400 ? data : undefined,
    });
  } catch (error) {
    const summary = summarizeProxyError(error);
    res.status(200).json({
      configured: true,
      status: "degraded",
      product_surface: configService.axisProductSurface,
      agent_id: configService.axisDefaultAgentId,
      org_id: getAxisOrgId(req),
      error: summary,
    });
  }
});

router.post("/axis/chat", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  const body = bodyRecord(req);
  const workspace = body.workspace && typeof body.workspace === "object" ? body.workspace : {};
  const payload = {
    message: body.message,
    task_id: body.task_id,
    chat_id: body.chat_id,
    channel: "ponti-web",
    product_surface: configService.axisProductSurface,
    agent_id: body.agent_id || configService.axisDefaultAgentId,
    route_hint: body.route_hint,
    confirmed_actions: body.confirmed_actions,
    handoff: {
      source: "ponti-web.axis-center",
      project_id: projectId,
      workspace,
      route_hint: body.route_hint,
    },
  };

  try {
    const { status, data } = await callAxis(req, userId, "POST", "/v1/chat", payload);
    res.status(status).json(normalizeAxisChat(data));
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/tasks", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { status, data } = await callAxis(req, userId, "GET", `/v1/tasks${buildQueryString(req.query)}`);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/tasks", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { status, data } = await callAxis(req, userId, "POST", "/v1/tasks", req.body);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/tasks/:task_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { task_id } = req.params;
    const { status, data } = await callAxis(req, userId, "GET", `/v1/tasks/${encodeURIComponent(task_id)}`);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/tasks/:task_id/graph", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { task_id } = req.params;
    const { status, data } = await callAxis(req, userId, "GET", `/v1/tasks/${encodeURIComponent(task_id)}/graph`);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/tasks/:task_id/investigate", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { task_id } = req.params;
    const { status, data } = await callAxis(
      req,
      userId,
      "POST",
      `/v1/tasks/${encodeURIComponent(task_id)}/investigate`,
      req.body
    );
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/memory", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const scope = await axisScope(req, userId);
    if (!scope.scopeId) {
      res.status(400).json(axisProxyError("No se pudo resolver scope de memoria Axis", 400));
      return;
    }
    const params = new URLSearchParams();
    params.set("scope_type", scope.scopeType);
    params.set("scope_id", scope.scopeId);
    for (const key of ["kind", "memory_type", "limit"]) {
      const value = req.query[key];
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q) params.set("q", q);
    const path = q ? `/v1/memory/search?${params.toString()}` : `/v1/memory?${params.toString()}`;
    const { status, data } = await callAxis(req, userId, "GET", path);
    res.status(status).json({ ...data, scope });
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/memory", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const body = bodyRecord(req);
  if (body.confirmed !== true) {
    res.status(400).json(axisProxyError("La memoria requiere confirmación explícita", 400));
    return;
  }
  const content = String(body.content_text || body.content || "").trim();
  if (!content) {
    res.status(400).json(axisProxyError("content_text es obligatorio", 400));
    return;
  }
  try {
    const scope = await axisScope(req, userId);
    if (!scope.scopeId) {
      res.status(400).json(axisProxyError("No se pudo resolver scope de memoria Axis", 400));
      return;
    }
    const kind = String(body.kind || "user_preference").trim();
    const memoryType = String(body.memory_type || (kind === "user_preference" ? "preference" : "operational")).trim();
    const payload = {
      kind,
      memory_type: memoryType,
      classification: body.classification || "internal",
      scope_type: scope.scopeType,
      scope_id: scope.scopeId,
      key: String(body.key || stableMemoryKey(content, kind, scope.scopeType)),
      content_text: content,
      payload_json: body.payload_json || { workspace: body.workspace || null },
      provenance: {
        source: "ponti-web.axis-center",
        confirmed_by: userId,
        captured_at: new Date().toISOString(),
      },
      confidence: typeof body.confidence === "number" ? body.confidence : 0.85,
      retention_policy: body.retention_policy || "default",
      source: "ponti-web.confirmed",
      supersede: body.supersede !== false,
      ttl_days: body.ttl_days || 0,
    };
    const { status, data } = await callAxis(req, userId, "PUT", "/v1/memory", payload);
    res.status(status).json({ ...data, scope });
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/watchers", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const orgId = await resolveAxisOrgId(req, userId);
    if (!orgId) {
      res.status(400).json(axisProxyError("No se pudo resolver org_id Axis para watchers", 400));
      return;
    }
    const params = new URLSearchParams({ org_id: orgId });
    const { status, data } = await callAxis(req, userId, "GET", `/v1/watchers?${params.toString()}`, undefined, orgId);
    res.status(status).json({ ...data, org_id: orgId });
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/watchers/ensure-ponti", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const workspace = bodyRecord(req).workspace || {};
  try {
    const orgId = await resolveAxisOrgId(req, userId);
    if (!orgId) {
      res.status(400).json(axisProxyError("No se pudo resolver org_id Axis para watchers", 400));
      return;
    }
    const current = await callAxis<Record<string, any>>(
      req,
      userId,
      "GET",
      `/v1/watchers?${new URLSearchParams({ org_id: orgId }).toString()}`,
      undefined,
      orgId
    );
    const existing = Array.isArray(current.data?.watchers) ? current.data.watchers : [];
    const existingByName = new Map(existing.map((w: any) => [String(w?.name || ""), w]));
    const created: any[] = [];
    const updated: any[] = [];
    for (const watcher of watcherDefaults(workspace, orgId)) {
      const currentWatcher = existingByName.get(watcher.name);
      if (currentWatcher?.id) {
        const { status, data } = await callAxis(
          req,
          userId,
          "PATCH",
          `/v1/watchers/${encodeURIComponent(String(currentWatcher.id))}`,
          { name: watcher.name, enabled: watcher.enabled, config: watcher.config },
          orgId
        );
        if (status < 400) updated.push(data);
        continue;
      }
      const { status, data } = await callAxis(req, userId, "POST", "/v1/watchers", watcher, orgId);
      if (status < 400) created.push(data);
    }
    res.status(200).json({ org_id: orgId, created, updated, existing });
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/watchers/:watcher_id/run", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { watcher_id } = req.params;
    const { status, data } = await callAxis(
      req,
      userId,
      "POST",
      `/v1/watchers/${encodeURIComponent(watcher_id)}/run`,
      {}
    );
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/watchers/:watcher_id/proposals", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { watcher_id } = req.params;
    const { status, data } = await callAxis(
      req,
      userId,
      "GET",
      `/v1/watchers/${encodeURIComponent(watcher_id)}/proposals`
    );
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.post("/axis/watchers/:watcher_id/sync-proposals", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;
  const workspace = bodyRecord(req).workspace || {};
  try {
    const { watcher_id } = req.params;
    const orgId = await resolveAxisOrgId(req, userId);
    if (!orgId) {
      res.status(400).json(axisProxyError("No se pudo resolver org_id Axis para sincronizar propuestas", 400));
      return;
    }
    const watcherRes = await callAxis<Record<string, any>>(
      req,
      userId,
      "GET",
      `/v1/watchers/${encodeURIComponent(watcher_id)}`,
      undefined,
      orgId
    );
    const proposalsRes = await callAxis<Record<string, any>>(
      req,
      userId,
      "GET",
      `/v1/watchers/${encodeURIComponent(watcher_id)}/proposals`,
      undefined,
      orgId
    );
    if (watcherRes.status >= 400 || proposalsRes.status >= 400) {
      res.status(502).json(
        axisProxyError("Axis no devolvió propuestas sincronizables", 502, {
          watcher_status: watcherRes.status,
          proposals_status: proposalsRes.status,
          watcher_error: watcherRes.data,
          proposals_error: proposalsRes.data,
        })
      );
      return;
    }
    const proposals = Array.isArray(proposalsRes.data?.proposals) ? proposalsRes.data.proposals : [];
    const headers = buildHeaders(userId, projectId);
    const cards: any[] = [];
    for (const proposal of proposals.slice(0, 25)) {
      const payload = proposalToDecisionPayload(proposal, watcherRes.data || {}, workspace);
      const { data } = await apiClient.post<any>("/ai/decision-cards/external", payload, headers);
      cards.push(data);
    }
    res.status(200).json({ watcher: watcherRes.data, proposals, cards });
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/traces", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { status, data } = await callAxis(req, userId, "GET", `/v1/run-traces${buildQueryString(req.query)}`);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.get("/axis/business-model", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { status, data } = await callAxis(req, userId, "GET", "/v1/business-model");
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

router.put("/axis/business-model", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { status, data } = await callAxis(req, userId, "PUT", "/v1/business-model", req.body);
    res.status(status).json(data);
  } catch (error) {
    handleError(res, error, { devDetails: JSON.stringify(summarizeProxyError(error)) });
  }
});

export default router;
