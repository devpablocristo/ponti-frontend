import axios, { isAxiosError } from "axios";
import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { proxyManagerChatStreamPost } from "../lib/managerChatStreamProxy";
import { requestContext } from "../requestContext";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

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

const buildHeaders = (userId: string, projectId: string) => {
  const tenantId = requestContext.getTenantId();
  return {
    "X-API-KEY": configService.apiKey,
    "X-User-Id": userId,
    "X-Project-Id": projectId,
    ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
  };
};

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

// --- Asistente conversacional (proxy a core → Axis Companion) ---

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
      tenantId: requestContext.getTenantId(),
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

export default router;
