import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

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

const handleError = (res: Response, error: any) => {
  const err = error as ApiResponse<null>;
  if ("error" in err) {
    res.status(err.error?.status || 500).json(err);
    return;
  }
  res.status(500).json({
    success: false,
    message: "Error inesperado",
    error: { status: 500, details: "No se pudo procesar la solicitud" },
  });
};

router.post("/ask", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/ask", req.body, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/rag/ingest", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/rag/ingest", req.body, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/insights/compute", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/insights/compute", {}, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/insights/summary", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.get<any>("/ai/insights/summary", headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/insights/:entity_type/:entity_id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { entity_type, entity_id } = req.params;
    const { data } = await apiClient.get<any>(
      `/ai/insights/${entity_type}/${entity_id}`,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/insights/:insight_id/actions", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { insight_id } = req.params;
    const { data } = await apiClient.post<any>(
      `/ai/insights/${insight_id}/actions`,
      req.body,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/jobs/recompute-active", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>("/ai/jobs/recompute-active", req.body, headers);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/jobs/recompute-baselines", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const projectId = requireProject(req, res);
  if (!projectId) return;

  try {
    const headers = buildHeaders(userId, projectId);
    const { data } = await apiClient.post<any>(
      "/ai/jobs/recompute-baselines",
      req.body,
      headers
    );
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
