import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import {
  buildWorkOrderScopeParams,
  hasWorkOrderScope,
  parseWorkOrderScope,
} from "../utils/workOrdersRoute";
import type { WorkOrderQueryScope } from "../utils/workOrdersRoute";

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

const requireWorkOrderScope = (scope: WorkOrderQueryScope, res: Response) => {
  if (hasWorkOrderScope(scope)) {
    return true;
  }

  res
    .status(400)
    .json({ message: "Cliente, proyecto y campaña son obligatorios" });
  return false;
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

    const scope = parseWorkOrderScope(req.query);
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;

    if (!requireWorkOrderScope(scope, res)) {
      return;
    }

    const params = buildWorkOrderScopeParams(scope);
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    const query = `?${params.toString()}`;

    // Sin caché a propósito: el listado se muta desde OTROS servicios (el BFF del mobile crea órdenes
    // contra el mismo backend). El NodeCache es en memoria por servicio y solo se invalida con escrituras
    // de ESTE servicio, así que cachear acá dejaba el listado stale hasta 30 min tras una creación hecha
    // desde el mobile. Es un proxy directo a la BDD: se lee siempre fresco para que aparezca al instante.
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

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    const query = `?${params.toString()}`;

    // Sin caché, igual que el listado activo: el backend se muta desde otros servicios.
    const headers = getAuthHeaders(userId);

    const { data: workorders } = await apiClient.get<WorkOrderListResponse>(
      `/work-orders/archived${query}`,
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
    if (!requireWorkOrderScope(scope, res)) {
      return;
    }

    const query = `?${buildWorkOrderScopeParams(scope).toString()}`;

    // Sin caché, mismo motivo que el listado: el dataset de filtros también refleja órdenes creadas
    // desde otros servicios y debe estar siempre fresco.
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

    const scope = parseWorkOrderScope(req.query);
    if (!requireWorkOrderScope(scope, res)) {
      return;
    }

    const headers = getAuthHeaders(userId);
    const query = `?${buildWorkOrderScopeParams(scope).toString()}`;

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

router.get("/export", async (req, res) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const scope = parseWorkOrderScope(req.query);
    if (!requireWorkOrderScope(scope, res)) {
      return;
    }

    const headers = getAuthHeaders(userId);

    const response = await apiClient.get<any>(
      `/work-orders/export?${buildWorkOrderScopeParams(scope).toString()}`,
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

router.post("/:id/archive", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    await apiClient.post<any>(
      `/work-orders/${req.params.id}/archive`,
      {},
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(200).json({
      success: true,
      message: "Orden archivada exitosamente",
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

router.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);

    await apiClient.post<any>(
      `/work-orders/${req.params.id}/restore`,
      {},
      headers
    );

    setImmediate(() => cache.flushAll());

    res.status(200).json({
      success: true,
      message: "Orden restaurada exitosamente",
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
