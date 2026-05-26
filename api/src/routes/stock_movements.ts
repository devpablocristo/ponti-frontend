import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

const CACHE_PREFIX = "stock_movements";

const buildHeaders = (userId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
});

const requireUser = (req: Request, res: Response): string | null => {
  const userId = req.user?.userID;
  if (!userId) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return null;
  }
  return userId;
};

const parseRequiredInt = (value: string | undefined, message: string): number => {
  const id = parseInt(value as string, 10) || 0;
  if (id === 0) throw new Error(message);
  return id;
};

router.get("/export/:id", async (req, res) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.id as string) || 0;
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const response = await apiClient.get<any>(
      `/projects/${project_id}/stock-movements/export`,
      { headers, responseType: "arraybuffer" }
    );

    res.setHeader("Content-Disposition", 'attachment; filename="stock.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(response.data);
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      error: { status: 500, details: "Error al exportar stock" },
    });
  }
});

router.get("/:project_id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.project_id as string) || 0;
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const cacheKey = `${CACHE_PREFIX}:${project_id}`;
    const cachedMovements = cache.get(cacheKey);
    if (cachedMovements) {
      res.status(200).json(cachedMovements);
      return;
    }

    const { data: movements } = await apiClient.get<any>(
      `/projects/${project_id}/stock-movements`,
      headers
    );

    if (!Array.isArray(movements?.entries)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (supply-movements)",
        error: { status: 502, details: "Se esperaba movements.entries como array" },
      });
      return;
    }
    const entries = movements.entries;
    const data = {
      success: true,
      data: {
        summary: movements.summary,
        entries,
        page_info: {
          total: entries.length,
          page: 1,
          per_page: 100,
          max_page: 1,
        },
      },
    };

    if (entries.length > 0) {
      cache.set(cacheKey, data);
    }

    res.status(200).json(data);
  } catch (error: any) {
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
  }
});

router.get("/:project_id/archived", async (req: Request, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const project_id = parseRequiredInt(req.params.project_id, "Proyecto obligatorio");

    const { data: movements } = await apiClient.get<any>(
      `/projects/${project_id}/stock-movements/archived`,
      buildHeaders(userId)
    );

    const entries = Array.isArray(movements?.entries) ? movements.entries : [];
    res.status(200).json({
      success: true,
      data: {
        summary: movements?.summary,
        entries,
        page_info: {
          total: entries.length,
          page: 1,
          per_page: 100,
          max_page: 1,
        },
      },
    });
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error inesperado",
      error: { status: 500, details: "No se pudo obtener movimientos archivados" },
    });
  }
});

router.post("/:id/project/:project_id/archive", async (req: Request, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const id = parseRequiredInt(req.params.id, "Id obligatorio");
    const project_id = parseRequiredInt(req.params.project_id, "Proyecto obligatorio");

    await apiClient.post<any>(
      `/projects/${project_id}/stock-movements/${id}/archive`,
      {},
      buildHeaders(userId)
    );
    cache.flushAll();
    res.status(200).json({ success: true });
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error inesperado",
      error: { status: 500, details: "No se pudo archivar movimiento de stock" },
    });
  }
});

router.post("/:id/project/:project_id/restore", async (req: Request, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const id = parseRequiredInt(req.params.id, "Id obligatorio");
    const project_id = parseRequiredInt(req.params.project_id, "Proyecto obligatorio");

    await apiClient.post<any>(
      `/projects/${project_id}/stock-movements/${id}/restore`,
      {},
      buildHeaders(userId)
    );
    cache.flushAll();
    res.status(200).json({ success: true });
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error inesperado",
      error: { status: 500, details: "No se pudo restaurar movimiento de stock" },
    });
  }
});

router.delete("/:id/project/:project_id/hard", async (req: Request, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const id = parseRequiredInt(req.params.id, "Id obligatorio");
    const project_id = parseRequiredInt(req.params.project_id, "Proyecto obligatorio");

    await apiClient.delete<any>(
      `/projects/${project_id}/stock-movements/${id}/hard`,
      buildHeaders(userId)
    );
    cache.flushAll();
    res.status(200).json({ success: true });
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      message: "Error inesperado",
      error: { status: 500, details: "No se pudo eliminar definitivamente movimiento de stock" },
    });
  }
});

router.delete(
  "/:id/project/:project_id",
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userID;
      if (!userId) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
      }

      const id = parseInt(req.params.id as string) || 0;
      if (id === 0) {
        res.status(400).json({ message: "Id obligatorio" });
        return;
      }

      const project_id = parseInt(req.params.project_id as string) || 0;
      if (project_id === 0) {
        res.status(400).json({ message: "Proyecto obligatorio" });
        return;
      }

      const headers = {
        "X-API-KEY": configService.apiKey,
        "X-User-Id": userId,
      };

      await apiClient.delete<any>(
        `/projects/${project_id}/stock-movements/${id}`,
        headers
      );

      const data = {
        success: true,
      };

      cache.flushAll();

      res.status(200).json(data);
    } catch (error: any) {
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
    }
  }
);

router.post("/:project_id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.project_id as string) || 0;
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: result } = await apiClient.post<any>(
      `/projects/${project_id}/stock-movements`,
      req.body,
      headers
    );

    const data = {
      success: true,
      data: result,
    };

    cache.flushAll();

    res.status(201).json(data);
  } catch (error: any) {
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
  }
});

export default router;
