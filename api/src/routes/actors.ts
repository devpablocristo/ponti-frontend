import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

// Proxy del BFF a los endpoints del Identity Gate (core /actors/*): búsqueda
// search-first, lookup por CUIT y resolve-or-create. Reenvía X-API-KEY + X-User-Id
// como el resto de las rutas.
const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

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

// GET /actors/search?q=&limit=  -> { exact:[], similar:[] }
router.get("/search", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const qs = new URLSearchParams();
    if (req.query.q) qs.set("q", String(req.query.q));
    if (req.query.limit) qs.set("limit", String(req.query.limit));
    const { data } = await apiClient.get<unknown>(`/actors/search?${qs.toString()}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// GET /actors/by-tax-id?tax_id=  -> 200 actor | 404 | 422
router.get("/by-tax-id", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const qs = new URLSearchParams();
    if (req.query.tax_id) qs.set("tax_id", String(req.query.tax_id));
    const { data } = await apiClient.get<unknown>(`/actors/by-tax-id?${qs.toString()}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// GET /actors/similar?name=&limit=  -> { candidates:[] } (advisory)
router.get("/similar", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const qs = new URLSearchParams();
    if (req.query.name) qs.set("name", String(req.query.name));
    if (req.query.limit) qs.set("limit", String(req.query.limit));
    const { data } = await apiClient.get<unknown>(`/actors/similar?${qs.toString()}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// GET /actors?status=&page=&per_page=  -> { data:[], page_info }
router.get("", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const qs = new URLSearchParams();
    if (req.query.status) qs.set("status", String(req.query.status));
    if (req.query.page) qs.set("page", String(req.query.page));
    if (req.query.per_page) qs.set("per_page", String(req.query.per_page));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const { data } = await apiClient.get<unknown>(`/actors${suffix}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// POST /actors  { name, tax_id?, role, allow_create } -> resolve-or-create
router.post("", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const { data } = await apiClient.post<unknown>("/actors", req.body, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

// POST /actors/:id/archive | /restore
router.post("/:id/archive", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.post<unknown>(`/actors/${req.params.id}/archive`, {}, headers);
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

router.post("/:id/restore", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.post<unknown>(`/actors/${req.params.id}/restore`, {}, headers);
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

// GET /actors/:id  | PUT /actors/:id  | DELETE /actors/:id
// (param routes al final para no tapar /search, /by-tax-id, /similar)
router.get("/:id", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    const { data } = await apiClient.get<unknown>(`/actors/${req.params.id}`, headers);
    res.status(200).json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.put<unknown>(`/actors/${req.params.id}`, req.body, headers);
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.delete<unknown>(`/actors/${req.params.id}`, headers);
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
