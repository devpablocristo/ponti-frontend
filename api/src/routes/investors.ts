import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";
import { buildForwardQuery } from "../utils/forwardQuery";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

const respondError = (res: Response, error: any) => {
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
};

const buildHeaders = (userId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
});

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const cached = cache.get("investors");
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const { data: investors } = await apiClient.get<any>("/investors", buildHeaders(userId));
    if (!Array.isArray(investors?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/investors)",
        error: { status: 502, details: "Se esperaba investors.data como array" },
      });
      return;
    }
    const total =
      typeof investors?.page_info?.total === "number"
        ? investors.page_info.total
        : investors.data.length;

    const data = {
      success: true,
      data: { data: investors.data, total },
    };

    if (investors.data.length > 0) cache.set("investors", data);
    res.status(200).json(data);
  } catch (error: any) {
    respondError(res, error);
  }
});

router.get("/archived", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data: investors } = await apiClient.get<any>(
      `/investors/archived${buildForwardQuery(req)}`,
      buildHeaders(userId)
    );
    if (!Array.isArray(investors?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/investors/archived)",
        error: { status: 502, details: "Se esperaba investors.data como array" },
      });
      return;
    }
    const total =
      typeof investors?.page_info?.total === "number"
        ? investors.page_info.total
        : investors.data.length;

    res.status(200).json({
      success: true,
      data: { data: investors.data, total },
    });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data } = await apiClient.post<any>(
      "/investors",
      req.body,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    respondError(res, error);
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

    await apiClient.put<any>(
      `/investors/${id}`,
      req.body,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
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

    await apiClient.post<any>(`/investors/${id}/archive`, {}, buildHeaders(userId));
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
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

    await apiClient.post<any>(`/investors/${id}/restore`, {}, buildHeaders(userId));
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
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

    await apiClient.delete<any>(`/investors/${id}/hard`, buildHeaders(userId));
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

export default router;
