import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import {
  buildCoreAuthHeaders,
  buildForwardQuery,
  scopedCacheKey,
} from "../utils/entitySelectors";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = buildCoreAuthHeaders(req, configService.apiKey);
    if (!headers) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const query = buildForwardQuery(req.query, { limitAsPerPage: true });
    const cacheKey = scopedCacheKey("campaigns", req, query);
    const cachedCampaigns = cache.get(cacheKey);
    if (cachedCampaigns) {
      res.status(200).json(cachedCampaigns);
      return;
    }

    const suffix = query ? `?${query}` : "";
    const { data: campaigns } = await apiClient.get<any>(`/campaigns${suffix}`, headers);
    const raw = campaigns;
    const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    const total =
      typeof raw?.page_info?.total === "number" ? raw.page_info.total : items.length;

    const data = {
      success: true,
      data: {
        data: items,
        total,
      },
    };

    cache.set(cacheKey, data);

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
