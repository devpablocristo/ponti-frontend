import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import {
  buildWorkOrderFilterRowsCacheKey,
  buildWorkOrderScopeParams,
  parseWorkOrderScope,
} from "../utils/workOrdersRoute";
import { buildForwardQuery } from "../utils/forwardQuery";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

const getAuthHeaders = (userId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
});

const normalizeDraftId = (id: string | number) => Math.abs(Number(id));

type PageInfo = {
  per_page: number;
  page: number;
  max_page: number;
  total: number;
};

type WorkOrderListItem = {
  id: number;
  number: string;
  project_name: string;
  field_name: string;
  lot_name: string;
  date: string;
  sequence_day?: number;
  crop_name: string;
  labor_name: string;
  labor_category_name: string;
  type_name: string;
  contractor: string;
  surface_ha: string;
  supply_name: string;
  consumption: string;
  category_name: string;
  dose: string;
  cost_per_ha: string;
  unit_price: string;
  total_cost: string;
  is_digital: boolean;
  status: string;
};

type WorkOrderListResponse = {
  items: WorkOrderListItem[];
  page_info: PageInfo;
};

type WorkOrderFilterRowsResponse = {
  rows: WorkOrderListItem[];
};

type WorkOrderListPayload = {
  success: true;
  data: {
    data: WorkOrderListItem[];
    page_info: PageInfo;
  };
};

type WorkOrderFilterRowsPayload = {
  success: true;
  data: {
    rows: WorkOrderListItem[];
  };
};

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

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const scope = parseWorkOrderScope(req.query);
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;

    const params = buildWorkOrderScopeParams(scope);
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    const query = `?${params.toString()}`;

    const cachedWorkorders = cache.get<WorkOrderListPayload>(`workorders:query:${query}`);
    if (cachedWorkorders) {
      res.status(200).json(cachedWorkorders);
      return;
    }

    const headers = getAuthHeaders(userId);

    const { data: workorders } = await apiClient.get<WorkOrderListResponse>(
      `/work-orders${query}`,
      headers
    );

    if (!workorders) {
      throw new Error("Respuesta vacía del servicio de órdenes");
    }

    const data: WorkOrderListPayload = {
      success: true,
      data: {
        data: workorders.items,
        page_info: workorders.page_info,
      },
    };

    cache.set(`workorders:query:${query}`, data);

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

router.get("/filter-rows", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const scope = parseWorkOrderScope(req.query);
    const params = buildWorkOrderScopeParams(scope);
    const queryString = params.toString();
    const query = queryString ? `?${queryString}` : "";
    const cacheKey = buildWorkOrderFilterRowsCacheKey(query);
    const cachedRows = cache.get<WorkOrderFilterRowsPayload>(cacheKey);
    if (cachedRows) {
      res.status(200).json(cachedRows);
      return;
    }

    const headers = getAuthHeaders(userId);

    const { data: filterRows } = await apiClient.get<WorkOrderFilterRowsResponse>(
      `/work-orders/filter-rows${query}`,
      headers
    );

    if (!filterRows) {
      throw new Error("Respuesta vacía del servicio de filtros de órdenes");
    }

    const data: WorkOrderFilterRowsPayload = {
      success: true,
      data: {
        rows: filterRows.rows,
      },
    };

    cache.set(cacheKey, data);

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
      error: { status: 500, details: "No se pudieron cargar los filtros de órdenes" },
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

    const params = buildWorkOrderScopeParams(parseWorkOrderScope(req.query));

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

    cache.flushAll();

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

    cache.flushAll();

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

    cache.flushAll();

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

router.get("/archived", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = getAuthHeaders(userId);
    const { data: workOrders } = await apiClient.get<any>(
      `/work-orders/archived${buildForwardQuery(req)}`,
      headers
    );
    const items = Array.isArray(workOrders?.data) ? workOrders.data : [];
    const total =
      typeof workOrders?.page_info?.total === "number"
        ? workOrders.page_info.total
        : items.length;
    res.status(200).json({
      success: true,
      data: { data: items, total },
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

router.post("/:id/archive", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = getAuthHeaders(userId);
    await apiClient.post<any>(`/work-orders/${req.params.id}/archive`, {}, headers);
    cache.flushAll();
    res.status(200).json({ success: true, message: "Orden archivada exitosamente" });
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

router.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = getAuthHeaders(userId);
    await apiClient.post<any>(`/work-orders/${req.params.id}/restore`, {}, headers);
    cache.flushAll();
    res.status(200).json({ success: true, message: "Orden restaurada exitosamente" });
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

router.delete("/:id/hard", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = getAuthHeaders(userId);
    await apiClient.delete<any>(`/work-orders/${req.params.id}/hard`, headers);
    cache.flushAll();
    res.status(200).json({ success: true, message: "Orden eliminada definitivamente" });
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
