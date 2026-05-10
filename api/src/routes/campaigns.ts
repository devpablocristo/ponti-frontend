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

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const customerId = parseInt(req.query.customer_id as string) || 0;
    const projectName = (req.query.project_name as string) || "";

    const params = new URLSearchParams();
    if (customerId > 0) params.set("customer_id", String(customerId));
    if (projectName) params.set("project_name", projectName);
    const queryString = params.toString();
    const url = queryString ? `campaigns?${queryString}` : "campaigns";

    const cachedCampaigns = cache.get(url);
    if (cachedCampaigns) {
      res.status(200).json(cachedCampaigns);
      return;
    }

    const { data: campaigns } = await apiClient.get<any>(url, headers);
    const raw = campaigns;
    const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

    const data = {
      success: true,
      data: {
        data: items,
        total: items.length,
      },
    };

    if (items.length > 0) {
      cache.set(url, data);
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
    const { data: campaigns } = await apiClient.get<any>("/campaigns/archived", headers);
    const items = Array.isArray(campaigns?.data) ? campaigns.data : [];
    const total =
      typeof campaigns?.page_info?.total === "number"
        ? campaigns.page_info.total
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

router.post("", async (req: Request, res: Response) => {
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
    const { data } = await apiClient.post<any>("/campaigns", req.body, headers);
    setImmediate(() => cache.flushAll());
    res.status(201).json({ success: true, data });
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
    const { id } = req.params;
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };
    await apiClient.put<any>(`/campaigns/${id}`, req.body, headers);
    setImmediate(() => cache.flushAll());
    res.status(200).json({ success: true, message: "Operación exitosa" });
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
    const { id } = req.params;
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };
    await apiClient.post<any>(`/campaigns/${id}/archive`, {}, headers);
    setImmediate(() => cache.flushAll());
    res.status(200).json({ success: true, message: "Operación exitosa" });
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
    const { id } = req.params;
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };
    await apiClient.post<any>(`/campaigns/${id}/restore`, {}, headers);
    setImmediate(() => cache.flushAll());
    res.status(200).json({ success: true, message: "Operación exitosa" });
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
    const { id } = req.params;
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };
    await apiClient.delete<any>(`/campaigns/${id}/hard`, headers);
    setImmediate(() => cache.flushAll());
    res.status(200).json({ success: true, message: "Operación exitosa" });
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
