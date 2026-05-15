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

  const cutOffDate = req.query.cutoff_date as string;
  if (cutOffDate && cutOffDate !== "") {
    params.set("cutoff_date", cutOffDate);
  }
  return params;
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
      `/projects/${project_id}/stocks/export`,
      //`/stocks/export/all`,
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
      error: { status: 500, details: "Error al exportar insumos" },
    });
  }
});

router.get("/periods/:id", async (req: Request, res: Response) => {
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

    const cachedStock = cache.get(`stock:periods:${projectId}`);
    if (cachedStock) {
      res.status(200).json(cachedStock);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: periods } = await apiClient.get<any>(
      `/projects/${projectId}/stocks/periods`,
      headers
    );

    const data = {
      success: true,
      data: periods,
    };

    if (Array.isArray(periods) && periods.length > 0) {
      cache.set(`stock:periods:${projectId}`, data);
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

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const params = buildWorkspaceParams(req);
    const queryString = params.toString();
    const cachedStock = cache.get(`stock:workspace:${queryString}`);
    if (cachedStock) {
      res.status(200).json(cachedStock);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: stock } = await apiClient.get<any>(
      queryString ? `/stocks/summary?${queryString}` : "/stocks/summary",
      headers
    );

    const data = {
      success: true,
      data: stock,
    };

    if (Array.isArray(stock?.items) && stock.items.length > 0) {
      cache.set(`stock:workspace:${queryString}`, data);
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

    let queryString = "";
    const cutOffDate = req.query.cutoff_date as string;
    if (cutOffDate && cutOffDate !== "") {
      queryString = `?cutoff_date=${cutOffDate}`;
    }

    const cachedStock = cache.get(`stock:${projectId}:${queryString}`);
    if (cachedStock) {
      res.status(200).json(cachedStock);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: stock } = await apiClient.get<any>(
      `/projects/${projectId}/stocks/summary${queryString}`,
      headers
    );

    const data = {
      success: true,
      data: stock,
    };

    if (Array.isArray(stock?.items) && stock.items.length > 0) {
      cache.set(`stock:${projectId}:${queryString}`, data);
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

router.put("/close/:id", async (req: Request, res: Response) => {
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

    const date = new Date(req.body.close_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const requestData = {
      close_date: date.toISOString(),
    };

    await apiClient.put<any>(
      `/projects/${req.params.id}/stocks/close-date?month_period=${month}&year_period=${year}`,
      requestData,
      headers
    );

    cache.flushAll();

    const data = {
      success: true,
      message: "Stock actualizado exitosamente",
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

router.put("/:id/:idStock", async (req: Request, res: Response) => {
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

    const requestData = {
      real_stock_units: req.body.real_stock_units,
      ...(req.body.updated_at ? { updated_at: req.body.updated_at } : {}),
    };

    await apiClient.put<any>(
      `/projects/${req.params.id}/stocks/real-stock/${req.params.idStock}`,
      requestData,
      headers
    );

    cache.flushAll();

    const data = {
      success: true,
      message: "Stock actualizado exitosamente",
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

export default router;


