import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

type StockSummaryPayload = {
  items?: unknown[];
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

    const response = await apiClient.get<ArrayBuffer>(
      `/projects/${project_id}/stocks/export`,
      { headers, responseType: "arraybuffer" }
    );

    res.setHeader("Content-Disposition", 'attachment; filename="stock.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(response.data);
  } catch (error: unknown) {
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

    const { data: stock } = await apiClient.get<StockSummaryPayload>(
      `/projects/${projectId}/stocks/summary${queryString}`,
      headers
    );

    const data = {
      success: true,
      data: stock,
    };

    if (Array.isArray(stock?.items)) {
      setImmediate(() => cache.set(`stock:${projectId}:${queryString}`, data));
    }

    res.status(200).json(data);
  } catch (error: unknown) {
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

router.post("/:projectId/supplies/:supplyId/counts", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const projectId = parseInt(req.params.projectId) || 0;
    const supplyId = parseInt(req.params.supplyId) || 0;
    if (projectId === 0 || supplyId === 0) {
      res.status(400).json({ message: "Proyecto e insumo son obligatorios" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const requestData = {
      counted_units: req.body.counted_units,
      counted_at: req.body.counted_at,
      note: req.body.note,
    };

    const { data: result } = await apiClient.post<unknown>(
      `/projects/${projectId}/supplies/${supplyId}/stock-counts`,
      requestData,
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
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
