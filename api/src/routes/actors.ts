import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from "../lib/cache";
import {
  buildCoreAuthHeaders,
  flushEntitySelectorCaches,
} from "../utils/entitySelectors";

// Mapa: rol de actor → path del endpoint de dominio en el core.
// Cuando se crea/actualiza un actor con estos roles, el BFF provisiona
// el registro de dominio (customer/investor/manager) en la misma operación.
// Con IDENTITY_GATE=true el backend resuelve la identidad por nombre y vincula
// el actor_id automáticamente. Si el registro ya existe devuelve 409 → ignorado (idempotente).
const DOMAIN_PATH: Record<string, string> = {
  customer: "/customers",
  investor: "/investors",
  manager:  "/managers",
};

async function provisionDomainRecords(
  headers: Record<string, string>,
  name: string,
  taxId: string | null | undefined,
  roles: string[],
): Promise<void> {
  for (const role of roles) {
    const path = DOMAIN_PATH[role];
    if (!path) continue;
    const body: Record<string, string> = { name };
    if (taxId) body.tax_id = taxId;
    try {
      await apiClient.post(path, body, headers);
    } catch {
      // 409 = ya existe (idempotente). Otros errores: best-effort, no bloquear.
    }
  }
}

// Proxy del BFF a los endpoints del Identity Gate (core /actors/*): búsqueda
// search-first, lookup por CUIT y resolve-or-create. Reenvía X-API-KEY + X-User-Id
// como el resto de las rutas.
const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

function authHeaders(req: Request): Record<string, string> | null {
  return buildCoreAuthHeaders(req, configService.apiKey);
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
    if (req.query.field) qs.set("field", String(req.query.field));
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
    const { data } = await apiClient.post<any>("/actors", req.body, headers);
    // Provisionar registros de dominio para roles customer/investor/manager.
    const roles: string[] = Array.isArray(req.body.roles)
      ? req.body.roles
      : req.body.role ? [req.body.role] : [];
    const actorName: string = (data as any)?.actor?.display_name ?? req.body.name ?? "";
    const taxId: string | undefined = req.body.tax_id;
    setImmediate(async () => {
      flushEntitySelectorCaches(cache);
      if (actorName && roles.length) {
        await provisionDomainRecords(headers, actorName, taxId, roles);
        flushEntitySelectorCaches(cache);
      }
    });
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
    setImmediate(() => flushEntitySelectorCaches(cache));
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
    setImmediate(() => flushEntitySelectorCaches(cache));
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

router.put("/:id/roles", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.put<unknown>(`/actors/${req.params.id}/roles`, req.body, headers);
    const roles: string[] = Array.isArray(req.body.roles) ? req.body.roles : [];
    setImmediate(async () => {
      flushEntitySelectorCaches(cache);
      if (roles.length) {
        try {
          const { data: actor } = await apiClient.get<any>(`/actors/${req.params.id}`, headers);
          const name: string = actor?.display_name ?? "";
          const taxKey = (actor?.keys ?? []).find((k: any) => k.type === "TAX_ID");
          const taxId: string | undefined = taxKey?.value;
          if (name) {
            await provisionDomainRecords(headers, name, taxId, roles);
            flushEntitySelectorCaches(cache);
          }
        } catch { /* best-effort */ }
      }
    });
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

router.put("/:id/tax-id", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }
  try {
    await apiClient.put<unknown>(`/actors/${req.params.id}/tax-id`, req.body, headers);
    setImmediate(() => flushEntitySelectorCaches(cache));
    res.status(200).json({ success: true });
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
    setImmediate(() => flushEntitySelectorCaches(cache));
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
    setImmediate(() => flushEntitySelectorCaches(cache));
    res.status(200).json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
