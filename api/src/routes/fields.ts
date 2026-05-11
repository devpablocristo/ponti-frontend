import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";
import { cache } from "./index";

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

    const project_id = parseInt(req.query.project_id as string) || 0;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;
    const url =
      project_id > 0
        ? `projects/fields/${project_id}`
        : `fields?page=${page}&per_page=${perPage}`;

    const cachedFields = cache.get(url);
    if (cachedFields) {
      res.status(200).json(cachedFields);
      return;
    }

    const { data: raw } = await apiClient.get<any>(
      project_id > 0
        ? `/projects/${project_id}/fields`
        : `/fields?page=${page}&per_page=${perPage}`,
      headers
    );

    const fields = Array.isArray(raw?.data) ? raw.data : raw.data?.data ?? raw;
    const total =
      typeof raw?.page_info?.total === "number"
        ? raw.page_info.total
        : Array.isArray(fields)
          ? fields.length
          : 0;
    const data = {
      success: true,
      data: {
        data: fields,
        total,
      },
    };

    if (Array.isArray(fields) && fields.length > 0) {
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
    const { data: fields } = await apiClient.get<any>("/fields/archived", headers);
    const items = Array.isArray(fields?.data) ? fields.data : [];
    const total =
      typeof fields?.page_info?.total === "number" ? fields.page_info.total : items.length;
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
    await apiClient.post<any>(`/fields/${id}/archive`, {}, headers);
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
    await apiClient.post<any>(`/fields/${id}/restore`, {}, headers);
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
    await apiClient.delete<any>(`/fields/${id}/hard`, headers);
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

router.delete("/:id", async (req: Request, res: Response) => {
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

    await apiClient.delete<any>(`/fields/${id}`, headers);
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
      error: { status: 500, details: "No se pudo obtener el proyecto" },
    });
  }
});

export default router;
