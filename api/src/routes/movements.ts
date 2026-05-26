import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import { parseFieldProjectQueryParams } from "../utils/queryParams";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

const appendPositiveInt = (params: URLSearchParams, key: string, value: number) => {
  if (Number.isFinite(value) && value > 0) {
    params.set(key, String(value));
  }
};

const buildWorkspaceParams = (req: Request) => {
  const ids = parseFieldProjectQueryParams(req.query);
  const params = new URLSearchParams();
  appendPositiveInt(params, "customer_id", ids.customerId);
  appendPositiveInt(params, "project_id", ids.projectId);
  appendPositiveInt(params, "campaign_id", ids.campaignId);
  appendPositiveInt(params, "field_id", ids.fieldId);
  return params;
};

const movementListPayload = (movements: any) => {
  if (!Array.isArray(movements?.entries)) {
    return null;
  }
  const entries = movements.entries;
  return {
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
      `/projects/${project_id}/supply-movements/export`,
      { headers, responseType: "arraybuffer" }
    );

    res.setHeader("Content-Disposition", 'attachment; filename="insumos.xlsx"');
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
      error: { status: 500, details: "Error al exportar insumos" },
    });
  }
});

router.get("/database-export/:id", async (req, res) => {
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
      `/supplies/export/all?project_id=${project_id}`,
      { headers, responseType: "arraybuffer" }
    );

    res.setHeader("Content-Disposition", 'attachment; filename="insumos.xlsx"');
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
      error: { status: 500, details: "Error al exportar insumos" },
    });
  }
});

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const params = buildWorkspaceParams(req);
    const query = params.toString();
    const cacheKey = `movements:workspace:${query}`;
    const cachedMovements = cache.get(cacheKey);
    if (cachedMovements) {
      res.status(200).json(cachedMovements);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: movements } = await apiClient.get<any>(
      query ? `/supply-movements?${query}` : "/supply-movements",
      headers
    );

    const data = movementListPayload(movements);
    if (!data) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (supply-movements)",
        error: { status: 502, details: "Se esperaba movements.entries como array" },
      });
      return;
    }

    if (data.data.entries.length > 0) {
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

router.get("/archived", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };
    const { data: movements } = await apiClient.get<any>(`/supply-movements/archived`, headers);
    const entries = Array.isArray(movements?.entries)
      ? movements.entries
      : Array.isArray(movements?.data)
        ? movements.data
        : [];
    res.status(200).json({
      success: true,
      data: {
        summary: movements?.summary,
        entries,
        page_info: { total: entries.length, page: 1, per_page: 100, max_page: 1 },
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

router.get("/:project_id/archived", async (req: Request, res: Response) => {
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

    const { data: movements } = await apiClient.get<any>(
      `/projects/${project_id}/supply-movements/archived`,
      headers
    );

    const entries = Array.isArray(movements?.entries)
      ? movements.entries
      : Array.isArray(movements?.data)
        ? movements.data
        : [];

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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
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

    const cachedMovements = cache.get(`movements:${project_id}`);
    if (cachedMovements) {
      res.status(200).json(cachedMovements);
      return;
    }

    const { data: movements } = await apiClient.get<any>(
      `/projects/${project_id}/supply-movements`,
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
      cache.set(`movements:${project_id}`, data);
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
        `/projects/${project_id}/supply-movements/${id}`,
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

router.post("/:id/project/:project_id/archive", async (req: Request, res: Response) => {
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

    const projectId = parseInt(req.params.project_id as string) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    await apiClient.post<any>(
      `/projects/${projectId}/supply-movements/${id}/archive`,
      {},
      headers
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

router.post("/:id/project/:project_id/restore", async (req: Request, res: Response) => {
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

    const projectId = parseInt(req.params.project_id as string) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    await apiClient.post<any>(
      `/projects/${projectId}/supply-movements/${id}/restore`,
      {},
      headers
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

router.delete("/:id/project/:project_id/hard", async (req: Request, res: Response) => {
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

    const projectId = parseInt(req.params.project_id as string) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    await apiClient.delete<any>(
      `/projects/${projectId}/supply-movements/${id}/hard`,
      headers
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

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
      `/projects/${project_id}/supply-movements`,
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

router.post("/:project_id/import", async (req: Request, res: Response) => {
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

    const { data: result } = await apiClient.post<Record<string, unknown>>(
      `/projects/${project_id}/supply-movements/import`,
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

router.put("/:id/project/:project_id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const movementId = parseInt(req.params.id as string) || 0;
    if (movementId === 0) {
      res.status(400).json({ message: "Id obligatorio" });
      return;
    }

    const projectId = parseInt(req.params.project_id as string) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Project Id obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: result } = await apiClient.put<any>(
      `/projects/${projectId}/supply-movements/${movementId}`,
      req.body,
      headers
    );

    const data = {
      success: true,
      data: result,
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
});

export default router;
