import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

const getAuthHeaders = (userId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
});

const normalizeDraftId = (id: string | number) => Math.abs(Number(id));

router.post("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    const requestData = {
      ...req.body,
      date: new Date(req.body.date).toISOString(),
    };

    const { data: workorder } = await apiClient.post<any>(
      "/work-orders",
      requestData,
      headers
    );

    const data = {
      success: true,
      data: workorder,
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

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const field_id = parseInt(req.query.field_id as string) || 0;
    const project_id = parseInt(req.query.project_id as string) || 0;
    const customer_id = parseInt(req.query.customer_id as string) || 0;
    const campaign_id = parseInt(req.query.campaign_id as string) || 0;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;
    const supply_id = parseInt(req.query.supply_id as string) || 0;
    const isDigital = req.query.is_digital as string | undefined;
    const status = req.query.status as string | undefined;

    if (field_id === 0 && project_id === 0) {
      res.status(400).json({ message: "Campo o proyecto obligatorio" });
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    if (field_id !== 0) {
      params.set("field_id", String(field_id));
    } else {
      params.set("project_id", String(project_id));
    }

    if (typeof isDigital === "string" && isDigital !== "") {
      params.set("is_digital", isDigital);
    }

    if (customer_id > 0) {
      params.set("customer_id", String(customer_id));
    }

    if (campaign_id > 0) {
      params.set("campaign_id", String(campaign_id));
    }

    if (typeof status === "string" && status !== "") {
      params.set("status", status);
    }

    if (supply_id > 0) {
      params.set("supply_id", String(supply_id));
    }

    const query = `?${params.toString()}`;

    const cachedWorkorders = cache.get(`workorders:query:${query}`);
    if (cachedWorkorders) {
      res.status(200).json(cachedWorkorders);
      return;
    }

    const headers = getAuthHeaders(userId);

    const { data: workorders } = await apiClient.get<any>(
      `/work-orders${query}`,
      headers
    );

    const data = {
      success: true,
      data: {
        data: workorders.items,
        page_info: workorders.page_info,
      },
    };

    setImmediate(() => cache.set(`workorders:query:${query}`, data));

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

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    const field_id = parseInt(req.query.field_id as string) || 0;
    const project_id = parseInt(req.query.project_id as string) || 0;
    const customer_id = parseInt(req.query.customer_id as string) || 0;
    const campaign_id = parseInt(req.query.campaign_id as string) || 0;
    const supply_id = parseInt(req.query.supply_id as string) || 0;

    if (field_id === 0 && project_id === 0) {
      res.status(400).json({ message: "Campo o proyecto obligatorio" });
      return;
    }

    const params = new URLSearchParams();
    if (field_id > 0) {
      params.set("field_id", String(field_id));
    } else if (project_id > 0) {
      params.set("project_id", String(project_id));
    }

    if (customer_id > 0) {
      params.set("customer_id", String(customer_id));
    }

    if (campaign_id > 0) {
      params.set("campaign_id", String(campaign_id));
    }

    if (supply_id > 0) {
      params.set("supply_id", String(supply_id));
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    const { data: metrics } = await apiClient.get<any>(
      `/work-orders/metrics${query}`,
      headers
    );

    const data = {
      success: true,
      data: metrics,
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

    const headers = getAuthHeaders(userId);

    const response = await apiClient.get<any>(
      `/work-orders/export?project_id=${project_id}`,
      { headers, responseType: "arraybuffer" }
    );

    res.setHeader("Content-Disposition", 'attachment; filename="ordenes.xlsx"');
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
      error: { status: 500, details: "Error al exportar ordenes" },
    });
  }
});

router.get("/drafts/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);
    const draftId = normalizeDraftId(req.params.id);

    const { data: workorderDraft } = await apiClient.get<any>(
      `/work-order-drafts/${draftId}`,
      headers
    );

    const data = {
      success: true,
      data: workorderDraft,
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

router.put("/drafts/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);
    const draftId = normalizeDraftId(req.params.id);

    const requestData = {
      ...req.body,
      date: req.body.date,
    };

    await apiClient.put<any>(
      `/work-order-drafts/${draftId}`,
      requestData,
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(204).send();
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

router.post("/drafts/:id/publish", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);
    const draftId = normalizeDraftId(req.params.id);

    const { data } = await apiClient.post<any>(
      `/work-order-drafts/${draftId}/publish`,
      {},
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(200).json({
      success: true,
      data,
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

router.delete("/drafts/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);
    const draftId = normalizeDraftId(req.params.id);

    await apiClient.delete<any>(
      `/work-order-drafts/${draftId}`,
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(200).json({
      success: true,
      message: "Borrador eliminado exitosamente",
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

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    const { data: workorder } = await apiClient.get<any>(
      `/work-orders/${req.params.id}`,
      headers
    );

    const data = {
      success: true,
      data: workorder,
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

    const headers = getAuthHeaders(userId);

    const requestData = {
      ...req.body,
      date: new Date(req.body.date).toISOString(),
    };

    await apiClient.put<any>(
      `/work-orders/${req.params.id}`,
      requestData,
      headers
    );

    const data = {
      success: true,
      message: "Orden actualizada exitosamente",
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

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    await apiClient.delete<any>(
      `/work-orders/${req.params.id}`,
      headers
    );

    const data = {
      success: true,
      message: "Orden eliminada exitosamente",
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
