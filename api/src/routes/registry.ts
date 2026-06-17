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

// GET /registry/usages?entity_type=&id=&name=&roles=
// Devuelve los proyectos activos donde se usa la entidad dada.
// Soporta: actor (roles: customer|investor|manager|lessee), campaigns (en este BFF);
// crops|types|lease-types|lot|field|project se proxean al backend Go.
// Los roles contractor/provider/biller no tienen soporte (no hay relación con proyectos
// todavía) y simplemente no aportan resultados.
router.get("/usages", async (req: Request, res: Response) => {
  const headers = authHeaders(req);
  if (!headers) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }

  const entityType = String(req.query.entity_type ?? "");
  const name       = String(req.query.name ?? "").trim();
  const roles      = String(req.query.roles ?? "").split(",").map((r) => r.trim()).filter(Boolean);

  type ProjectItem = { id: number; name: string; customer: string; campaign: string };

  // ── Campañas ──────────────────────────────────────────────────────────────
  if (entityType === "campaigns") {
    const id = parseInt(String(req.query.id ?? ""), 10);
    if (!id) {
      res.status(400).json({ success: false, message: "id requerido" });
      return;
    }
    try {
      const { data } = await apiClient.get<any>(`/projects?campaign_id=${id}&per_page=100`, headers);
      const items: ProjectItem[] = (data?.items ?? []).map((p: any) => ({
        id:       p.id,
        name:     p.name,
        customer: p.customer?.name ?? "",
        campaign: p.campaign?.name ?? "",
      }));
      res.status(200).json({ success: true, data: { items, total: items.length } });
    } catch (error) { fail(res, error); }
    return;
  }

  // ── Actores ───────────────────────────────────────────────────────────────
  if (entityType === "actor") {
    if (!name) {
      res.status(400).json({ success: false, message: "name requerido para actores" });
      return;
    }

    const found: ProjectItem[] = [];
    const seenIds = new Set<number>();

    const addProject = (p: any) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        found.push({ id: p.id, name: p.name, customer: p.customer?.name ?? "", campaign: p.campaign?.name ?? "" });
      }
    };

    // Rol cliente: busca el customer por nombre, luego proyectos por customer_id
    if (roles.includes("customer")) {
      try {
        const { data: custData } = await apiClient.get<any>("/customers", headers);
        const customers: any[] = custData?.data ?? custData?.items ?? [];
        const match = customers.find(
          (c: any) => (c.name ?? "").toLowerCase() === name.toLowerCase()
        );
        if (match?.id) {
          const { data } = await apiClient.get<any>(`/projects?customer_id=${match.id}&per_page=100`, headers);
          (data?.items ?? []).forEach(addProject);
        }
      } catch { /* ignorar */ }
    }

    // Roles inversor/manager: traer todos los proyectos y filtrar por nombre
    if (roles.includes("investor") || roles.includes("manager")) {
      try {
        const { data } = await apiClient.get<any>("/projects?per_page=200", headers);
        (data?.items ?? []).forEach((p: any) => {
          const inInvestors = (p.investors ?? []).some(
            (inv: any) => (inv.name ?? "").toLowerCase() === name.toLowerCase()
          );
          const inManagers = (p.managers ?? []).some(
            (mgr: any) => (mgr.name ?? "").toLowerCase() === name.toLowerCase()
          );
          if (inInvestors || inManagers) addProject(p);
        });
      } catch { /* ignorar */ }
    }

    // Rol arrendatario: campos donde el actor está en field_lessees (resuelto en el backend Go)
    if (roles.includes("lessee")) {
      try {
        const idNum = parseInt(String(req.query.id ?? ""), 10);
        if (idNum) {
          const { data } = await apiClient.get<any>(`/registry/usages?entity_type=actor&id=${idNum}`, headers);
          (data?.items ?? []).forEach(addProject);
        }
      } catch { /* ignorar */ }
    }

    // Roles contractor/provider/biller — requieren work-orders, aún no implementado.
    // No se reporta como "no soportado": simplemente no hay resultados.

    res.status(200).json({
      success: true,
      data: { items: found, total: found.length },
    });
    return;
  }

  // ── Cultivos / Tipos / Tipos de arriendo / Lote / Campo / Proyecto → Go ──
  // Para lot/field/project "usos" = proyecto(s) en cuya jerarquía vive la entidad.
  if (
    entityType === "crops" ||
    entityType === "types" ||
    entityType === "lease-types" ||
    entityType === "lot" ||
    entityType === "field" ||
    entityType === "project"
  ) {
    const id = parseInt(String(req.query.id ?? ""), 10);
    if (!id) {
      res.status(400).json({ success: false, message: "id requerido" });
      return;
    }
    try {
      const { data } = await apiClient.get<unknown>(
        `/registry/usages?entity_type=${entityType}&id=${id}`,
        headers
      );
      res.status(200).json({ success: true, data });
    } catch (error) { fail(res, error); }
    return;
  }

  res.status(400).json({ success: false, message: "entity_type no soportado" });
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
