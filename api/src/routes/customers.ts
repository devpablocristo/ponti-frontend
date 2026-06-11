import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import {
  buildCoreAuthHeaders,
  buildForwardQuery,
  flushEntitySelectorCaches,
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
    const cacheKey = scopedCacheKey("customers", req, query);
    const cachedCustomers = cache.get(cacheKey);
    if (cachedCustomers) {
      res.status(200).json(cachedCustomers);
      return;
    }

    const suffix = query ? `?${query}` : "";
    const { data: customers } = await apiClient.get<any>(`/customers${suffix}`, headers);

    if (!Array.isArray(customers?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/customers)",
        error: { status: 502, details: "Se esperaba customers.data como array" },
      });
      return;
    }
    const total =
      typeof customers?.page_info?.total === "number"
        ? customers.page_info.total
        : customers.data.length;

    const data = {
      success: true,
      data: {
        data: customers.data,
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

router.get("/archived", async (req: Request, res: Response) => {
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
    const cacheKey = scopedCacheKey("customers:archived", req, query);
    const cachedCustomers = cache.get(cacheKey);
    if (cachedCustomers) {
      res.status(200).json(cachedCustomers);
      return;
    }

    const { data: customers } = await apiClient.get<any>(
      `/customers/archived${query ? `?${query}` : ""}`,
      headers
    );

    if (!Array.isArray(customers?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/customers/archived)",
        error: { status: 502, details: "Se esperaba customers.data como array" },
      });
      return;
    }
    const total =
      typeof customers?.page_info?.total === "number"
        ? customers.page_info.total
        : customers.data.length;

    const data = {
      success: true,
      data: {
        data: customers.data,
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

router.put("/:id/archive", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    await apiClient.post<any>(`/customers/${id}/archive`, {}, headers);
    setImmediate(() => flushEntitySelectorCaches(cache));
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

router.put("/:id/restore", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    await apiClient.post<any>(`/customers/${id}/restore`, {}, headers);
    setImmediate(() => flushEntitySelectorCaches(cache));
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

    const headers = buildCoreAuthHeaders(req, configService.apiKey);
    if (!headers) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    await apiClient.delete<any>(`/customers/${id}`, headers);
    setImmediate(() => flushEntitySelectorCaches(cache));
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
