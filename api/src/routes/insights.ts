import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

function buildHeaders(req: Request, userId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-KEY": configService.apiKey,
    "X-User-Id": userId,
  };
  const projectId = req.headers["x-project-id"];
  if (typeof projectId === "string" && projectId.trim() !== "") {
    headers["X-Project-Id"] = projectId.trim();
  }
  return headers;
}

function handleErr(res: Response, error: unknown, fallback: string) {
  const err = error as ApiResponse<null>;
  if (err && typeof err === "object" && "error" in err) {
    res.status(err.error?.status || 500).json(err);
    return;
  }
  res.status(500).json({
    success: false,
    message: "Error inesperado",
    error: { status: 500, details: fallback },
  });
}

router.get("", async (req: Request, res: Response) => {
  const userId = req.user?.userID;
  if (!userId) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit.trim() : "";
    const includeResolved = req.query.include_resolved === "true";
    const qs = new URLSearchParams();
    if (limitRaw) qs.set("limit", limitRaw);
    if (includeResolved) qs.set("include_resolved", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const { data } = await apiClient.get<any>(`/insights${suffix}`, buildHeaders(req, userId));
    res.status(200).json(data);
  } catch (error) {
    handleErr(res, error, "No se pudieron cargar los insights");
  }
});

const proxyMutation = (method: "POST" | "DELETE", suffix: string, fallback: string) =>
  async (req: Request, res: Response) => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ message: "id requerido" });
      return;
    }
    try {
      const headers = buildHeaders(req, userId);
      const path = `/insights/${encodeURIComponent(id)}${suffix}`;
      if (method === "POST") {
        await apiClient.post<any>(path, {}, headers);
      } else {
        await apiClient.delete<any>(path, headers);
      }
      res.status(204).end();
    } catch (error) {
      handleErr(res, error, fallback);
    }
  };

router.post("/:id/read", proxyMutation("POST", "/read", "No se pudo marcar como leida"));
router.delete("/:id/read", proxyMutation("DELETE", "/read", "No se pudo desmarcar"));
router.post("/:id/resolve", proxyMutation("POST", "/resolve", "No se pudo resolver"));
router.delete("/:id/resolve", proxyMutation("DELETE", "/resolve", "No se pudo reabrir"));

export default router;
