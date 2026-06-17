import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { buildCoreAuthHeaders } from "../utils/entitySelectors";

// Factory de routers CRUDAR genéricos para catálogos (no-actors). Cada uno proxea a un
// path del core bajo /catalog/<entidad>, sin tocar las rutas GET existentes (/crops, etc.)
// que consume el form de project. Reenvía X-API-KEY + X-User-Id.
const apiClient = new ApiClient(configService.baseManagerApi);

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

export function catalogRouter(
  corePath: string,
  opts: { archive?: boolean; nameUpdatePath?: string } = {},
): Router {
  const r = Router();

  r.get("", async (req: Request, res: Response) => {
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
      const { data } = await apiClient.get<unknown>(`${corePath}${suffix}`, headers);
      res.status(200).json({ success: true, data });
    } catch (error) {
      fail(res, error);
    }
  });

  r.post("", async (req: Request, res: Response) => {
    const headers = authHeaders(req);
    if (!headers) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    try {
      const { data } = await apiClient.post<unknown>(corePath, req.body, headers);      res.status(201).json({ success: true, data });
    } catch (error) {
      fail(res, error);
    }
  });

  if (opts.archive) {
    r.post("/:id/archive", async (req: Request, res: Response) => {
      const headers = authHeaders(req);
      if (!headers) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
      }
      try {
        await apiClient.post<unknown>(`${corePath}/${req.params.id}/archive`, {}, headers);        res.status(200).json({ success: true });
      } catch (error) {
        fail(res, error);
      }
    });

    r.post("/:id/restore", async (req: Request, res: Response) => {
      const headers = authHeaders(req);
      if (!headers) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
      }
      try {
        await apiClient.post<unknown>(`${corePath}/${req.params.id}/restore`, {}, headers);        res.status(200).json({ success: true });
      } catch (error) {
        fail(res, error);
      }
    });
  }

  r.put("/:id", async (req: Request, res: Response) => {
    const headers = authHeaders(req);
    if (!headers) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    try {
      // Para entidades estructurales (ej. proyecto), el core no acepta PUT completo
      // con solo {name}; se usa un endpoint dedicado de actualización de nombre.
      if (opts.nameUpdatePath) {
        await apiClient.patch<unknown>(
          `${corePath}/${req.params.id}${opts.nameUpdatePath}`,
          { name: req.body?.name },
          headers,
        );
      } else {
        await apiClient.put<unknown>(`${corePath}/${req.params.id}`, req.body, headers);
      }      res.status(200).json({ success: true });
    } catch (error) {
      fail(res, error);
    }
  });

  r.delete("/:id", async (req: Request, res: Response) => {
    const headers = authHeaders(req);
    if (!headers) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    try {
      await apiClient.delete<unknown>(`${corePath}/${req.params.id}`, headers);      res.status(200).json({ success: true });
    } catch (error) {
      fail(res, error);
    }
  });

  return r;
}
