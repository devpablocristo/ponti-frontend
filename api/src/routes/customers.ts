import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import { buildForwardQuery } from "../utils/forwardQuery";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const requestedPerPage =
      parseInt(req.query.per_page as string) || parseInt(req.query.limit as string) || 1000;
    const perPage = Math.min(Math.max(requestedPerPage, 1), 1000);
    const status = (req.query.status as string) || "";

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (status) {
      params.set("status", status);
    }

    const cacheKey = `customers:${params.toString()}`;
    const cachedCustomers = cache.get(cacheKey);
    if (cachedCustomers) {
      res.status(200).json(cachedCustomers);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: customers } = await apiClient.get<any>(
      `/customers?${params.toString()}`,
      headers
    );

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

    if (customers.data.length > 0) {
      cache.set(cacheKey, data);
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

    const { data: customers } = await apiClient.get<any>(
      `/customers/archived${buildForwardQuery(req)}`,
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

    const { data } = await apiClient.post<any>("/customers", req.body, headers);
    cache.flushAll();
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

    await apiClient.put<any>(`/customers/${id}`, req.body, headers);
    cache.flushAll();
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

    await apiClient.post<any>(`/customers/${id}/archive`, {}, headers);
    cache.flushAll();
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

    await apiClient.post<any>(`/customers/${id}/restore`, {}, headers);
    cache.flushAll();
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

    await apiClient.delete<any>(`/customers/${id}/hard`, headers);
    cache.flushAll();
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
