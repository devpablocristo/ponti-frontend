import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from ".";

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
    const cached = cache.get("managers");
    if (cached) {
      res.status(200).json(cached);
      return;
    }
    const { data: managers } = await apiClient.get<any>("/managers", buildHeaders(userId));
    if (!Array.isArray(managers?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/managers)",
        error: { status: 502, details: "Se esperaba managers.data como array" },
      });
      return;
    }
    const total =
      typeof managers?.page_info?.total === "number"
        ? managers.page_info.total
        : managers.data.length;
    const data = {
      success: true,
      data: { data: managers.data, total },
    };
    if (managers.data.length > 0) cache.set("managers", data);
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
    const { data: managers } = await apiClient.get<any>("/managers/archived", buildHeaders(userId));
    if (!Array.isArray(managers?.data)) {
      res.status(502).json({
        success: false,
        message: "Respuesta inválida del backend (/managers/archived)",
        error: { status: 502, details: "Se esperaba managers.data como array" },
      });
      return;
    }
    const total =
      typeof managers?.page_info?.total === "number"
        ? managers.page_info.total
        : managers.data.length;
    res.status(200).json({
      success: true,
      data: { data: managers.data, total },
    });
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
    await apiClient.post<any>(`/managers/${id}/archive`, {}, buildHeaders(userId));
    setImmediate(() => cache.flushAll());
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
    await apiClient.post<any>(`/managers/${id}/restore`, {}, buildHeaders(userId));
    setImmediate(() => cache.flushAll());
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
    await apiClient.delete<any>(`/managers/${id}/hard`, buildHeaders(userId));
    setImmediate(() => cache.flushAll());
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

export default router;
