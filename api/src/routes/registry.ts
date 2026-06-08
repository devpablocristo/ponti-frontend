import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

// Router del registry (búsqueda unificada + edición de alias). Proxea al core /registry/*.
// Reenvía X-API-KEY + X-User-Id. No toca otras rutas.
const apiClient = new ApiClient(configService.baseManagerApi);
const router = Router();

function authHeaders(req: Request): Record<string, string> | null {
  const userId = req.user?.userID;
  if (!userId) return null;
  return { "X-API-KEY": configService.apiKey, "X-User-Id": userId };
}

function fail(res: Response, error: unknown) {
  const err = error as ApiResponse<null>;
  if (err && typeof err === "object" && "error" in err && err.error) {
    res.status(err.error.status || 500).json(err);
    return;
  }
  res.status(500).json({
    success: false,
    message: "Error inesperado",
    error: { status: 500, details: "No se pudo procesar la solicitud" },
  });
}

// GET /registry?q=&type=&status=&page=&per_page=
router.get("", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const qs = new URLSearchParams();
    for (const k of ["q", "type", "status", "page", "per_page"]) {
      if (req.query[k] != null && req.query[k] !== "") qs.set(k, String(req.query[k]));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const { data } = await apiClient.get<unknown>(`/registry${suffix}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// PUT /registry/actors/:id/aliases  { aliases: [] }
router.put("/actors/:id/aliases", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.put<unknown>(`/registry/actors/${req.params.id}/aliases`, req.body, headers);
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
