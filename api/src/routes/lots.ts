import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import {
  parseFieldProjectQueryParams,
  parsePaginationQueryParams,
  parsePositiveIntParam,
} from "../utils/queryParams";
import {
  buildLotsListCacheKey,
  buildLotsMetricsCacheKey,
  buildLotsQueryParams,
  isLotsCacheKey,
} from "../utils/lotsRoute";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

type DecimalString = string | null;

type PageInfo = {
  per_page: number;
  page: number;
  max_page: number;
  total: number;
};

type LotDate = {
  sowing_date: string;
  harvest_date: string | null;
  sequence: number;
};

type LotListItem = {
  id: number;
  project_id: number;
  field_id: number;
  previous_crop_id: number;
  current_crop_id: number;
  project_name: string;
  field_name: string;
  lot_name: string;
  previous_crop: string;
  current_crop: string;
  variety: string;
  hectares: DecimalString;
  sowed_area: DecimalString;
  harvested_area: DecimalString;
  harvest_date?: string | null;
  dates: LotDate[];
  season: string;
  tons: DecimalString;
  cost_usd_per_ha: DecimalString;
  admin_cost: DecimalString;
  yield_tn_per_ha: DecimalString;
  income_net_per_ha: DecimalString;
  rent_per_ha: DecimalString;
  active_total_per_ha: DecimalString;
  operating_result_per_ha: DecimalString;
  updated_at?: string | null;
};

type LotListResponse = {
  items: LotListItem[];
  page_info: PageInfo;
};

type LotMetricsResponse = {
  seeded_area: string;
  harvested_area: string;
  yield_tn_per_ha: string;
  cost_per_hectare: string;
  superficie_total: string;
};

type LotListPayload = {
  success: true;
  data: {
    data: LotListItem[];
    page_info: PageInfo;
  };
};

type LotMetricsPayload = {
  success: true;
  data: LotMetricsResponse;
};

const getLotQueryFilters = (req: Request) => {
  return parseFieldProjectQueryParams(req.query);
};

const invalidateLotsCache = () => {
  const lotCacheKeys = cache.keys().filter(isLotsCacheKey);

  if (lotCacheKeys.length > 0) {
    cache.del(lotCacheKeys);
  }
};

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { fieldId, projectId } = getLotQueryFilters(req);
    if (fieldId === 0 && projectId === 0) {
      res.status(400).json({ message: "Campo o proyecto obligatorio" });
      return;
    }

    const { page, perPage } = parsePaginationQueryParams(req.query);
    const lotIds = { fieldId, projectId };
    const key = buildLotsListCacheKey(lotIds, { page, perPage });

    const cachedLots = cache.get<LotListPayload>(key);
    if (cachedLots) {
      res.status(200).json(cachedLots);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: lots } = await apiClient.get<LotListResponse>(
      `/lots?${buildLotsQueryParams(lotIds, { page, perPage })}`,
      headers
    );

    if (!lots) {
      throw new Error("Respuesta vacía del servicio de lotes");
    }

    const data: LotListPayload = {
      success: true,
      data: {
        data: lots.items,
        page_info: lots.page_info,
      },
    };

    setImmediate(() => cache.set(key, data));

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

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { fieldId, projectId } = getLotQueryFilters(req);
    if (fieldId === 0 && projectId === 0) {
      res.status(400).json({ message: "Campo o proyecto obligatorio" });
      return;
    }

    const lotIds = { fieldId, projectId };
    const key = buildLotsMetricsCacheKey(lotIds);

    const cachedLots = cache.get<LotMetricsPayload>(key);
    if (cachedLots) {
      res.status(200).json(cachedLots);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: metrics } = await apiClient.get<LotMetricsResponse>(
      `/lots/metrics?${buildLotsQueryParams(lotIds)}`,
      headers
    );

    if (!metrics) {
      throw new Error("Respuesta vacía del servicio de métricas de lotes");
    }

    const data: LotMetricsPayload = {
      success: true,
      data: metrics,
    };

    setImmediate(() => cache.set(key, data));

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

router.get("/export/:id", async (req, res) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parsePositiveIntParam(req.params.id, 0);
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const response = await apiClient.get<ArrayBuffer>(
      `/lots/export?project_id=${project_id}`,
      { headers, responseType: "arraybuffer" }
    );
    if (!response.data) {
      throw new Error("Respuesta vacía al exportar lotes");
    }

    res.setHeader("Content-Disposition", 'attachment; filename="lots.xlsx"');
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
      error: { status: 500, details: "Error al exportar lotes" },
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

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const requestData = {
      name: req.body.lot_name,
      hectares: parseFloat(req.body.sowed_area),
      season: req.body.season,
      current_crop_id: req.body.current_crop_id,
      previous_crop_id: req.body.previous_crop_id,
      variety: req.body.variety,
      dates: req.body.dates,
      updated_at: req.body.updated_at,
    };

    await apiClient.put<unknown>(`/lots/${req.params.id}`, requestData, headers);

    setImmediate(invalidateLotsCache);

    const data = {
      success: true,
      message: "Lote actualizado exitosamente",
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

router.put("/:id/tons", async (req: Request, res: Response) => {
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

    const tons = parseFloat(req.body.tons) || 0;

    await apiClient.put<unknown>(
      `/lots/${req.params.id}/tons`,
      { tons: tons.toString() },
      headers
    );

    setImmediate(invalidateLotsCache);

    const data = {
      success: true,
      message: "Lote actualizado exitosamente",
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
      error: { status: 500, details: "No se pudo procesar la solicitud" },
    });
  }
});

export default router;
