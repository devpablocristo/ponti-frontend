import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const projectId = parseInt(req.query.project_id as string) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const cachedSupplies = cache.get(`supplies:${projectId}`);
    if (cachedSupplies) {
      res.status(200).json(cachedSupplies);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": String(userId),
    };

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;

    const params = new URLSearchParams({
      project_id: String(projectId),
      page: String(page),
      per_page: String(perPage),
    });
    const { data: backendResp } = await apiClient.get<any>(
      `/supplies?${params.toString()}`,
      headers
    );

    if (!Array.isArray(backendResp?.data) || !backendResp?.page_info) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/supplies)",
        error: {
          status: 502,
          details: "Se esperaba backendResp.data (array) y backendResp.page_info",
        },
      });
      return;
    }

    const items = backendResp.data;
    const pageInfo = backendResp.page_info;

    const data = {
      success: true,
      data: {
        data: items,
        page_info: pageInfo,
      },
    };

    if (items.length > 0) {
      setImmediate(() => cache.set(`supplies:${projectId}`, data));
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

router.put("/projects/:project_id/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": String(userId),
    };

    //   ProjectID int64           `json:"project_id"`
    // Name      string          `json:"name"`
    // Price     decimal.Decimal `json:"price"`

    // UnitID     int64 `json:"unit_id"`
    // CategoryID int64 `json:"category_id"`
    // TypeID     int64 `json:"type_id"`
    // IsPartialPrice bool `json:"is_partial_price"`

    // Qué había antes:
    // - El BFF no reenviaba `is_partial_price` en edición.
    // Qué agregamos:
    // - Passthrough del checkbox parcial/final al backend.
    // Por qué:
    // - Si no, el cambio de estado no se persistía desde el modal de edición.
    const requestData = {
      id: req.body.id,
      project_id: Number(req.params.project_id),
      name: req.body.name,
      category_id: req.body.category_id,
      price: req.body.price,
      unit_id: req.body.unit_id,
      type_id: req.body.type_id,
      is_partial_price: Boolean(req.body.is_partial_price),
    };

    const { data: workorder } = await apiClient.put<any>(
      `/supplies/${req.params.id}`,
      requestData,
      headers
    );

    setImmediate(() => cache.flushAll());

    const data = {
      success: true,
      data: workorder.data,
    };

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

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const projectId = parseInt(req.params.id) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": String(userId),
    };

    let supplies = req.body;
    if (Array.isArray(supplies)) {
      // Qué había antes:
      // - En alta masiva solo viajaban nombre/unidad/precio/rubro/tipo.
      // Qué agregamos:
      // - `is_partial_price` para crear insumos con estado parcial/final.
      // Por qué:
      // - El checkbox de alta necesita persistirse desde el primer guardado.
      supplies = supplies.map((item: any) => ({
        name: item.name,
        price: Number(item.price),
        unit_id: Number(item.unit),
        category_id: Number(item.category),
        type_id: Number(item.type),
        project_id: projectId,
        is_partial_price: Boolean(item.is_partial_price),
      }));
    } else {
      res.status(400).json({ message: "Insumo obligatorio" });
      return;
    }

    await apiClient.post<any>(`/supplies/bulk`, supplies, headers);

    setImmediate(() => cache.flushAll());

    const data = {
      success: true,
      message: "Lote actualizado exitosamente",
    };

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

router.get("/workorders-count/:supply_id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const supply_id = parseInt(req.params.supply_id as string) || 0;
    if (supply_id === 0) {
      res.status(400).json({ message: "Insumo obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data } = await apiClient.get<any>(
      `/supplies/${supply_id}/workorders-count`,
      headers
    );

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    const err = error as ApiResponse<null>;
    if ("error" in err) {
      res.status(err.error?.status || 500).json(err);
      return;
    }
    res.status(500).json({
      success: false,
      error: { status: 500, details: "Error al obtener conteo" },
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const projectId = parseInt(req.params.id) || 0;
    if (projectId === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const cachedSupplies = cache.get(`supplies:${projectId}`);
    if (cachedSupplies) {
      res.status(200).json(cachedSupplies);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": String(userId),
    };

    const { data: backendResp } = await apiClient.get<any>(
      `/supplies?project_id=${projectId}&page=1&per_page=1000`,
      headers
    );

    if (!Array.isArray(backendResp?.data) || !backendResp?.page_info) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/supplies)",
        error: {
          status: 502,
          details: "Se esperaba backendResp.data (array) y backendResp.page_info",
        },
      });
      return;
    }

    const items = backendResp.data;
    const pageInfo = backendResp.page_info;

    const data = {
      success: true,
      data: {
        data: items,
        page_info: pageInfo,
      },
    };

    if (items.length > 0) {
      setImmediate(() => cache.set(`supplies:${projectId}`, data));
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

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const supplyId = parseInt(req.params.id) || 0;
    if (supplyId === 0) {
      res.status(400).json({ message: "Insumo obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": String(userId),
    };

    const { data: supplies } = await apiClient.delete<any>(
      `/supplies/${supplyId}`,
      headers
    );

    const data = {
      success: true,
      data: supplies,
    };

    setImmediate(() => cache.flushAll());

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
