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

const buildQuery = (req: Request) => {
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined) params.append(key, String(item));
      });
      return;
    }
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const normalizeListResponse = (actors: any) => {
  const data = Array.isArray(actors?.data) ? actors.data : [];
  const total =
    typeof actors?.page_info?.total === "number"
      ? actors.page_info.total
      : data.length;

  return {
    success: true,
    data: { data, total },
  };
};

router.get("", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data: actors } = await apiClient.get<any>(
      "/actors" + buildQuery(req),
      buildHeaders(userId),
    );
    res.status(200).json(normalizeListResponse(actors));
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

    const { data: actors } = await apiClient.get<any>(
      "/actors/archived" + buildQuery(req),
      buildHeaders(userId),
    );
    res.status(200).json(normalizeListResponse(actors));
  } catch (error: any) {
    respondError(res, error);
  }
});

router.get("/duplicate-candidates", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data } = await apiClient.get<any>(
      "/actors/duplicate-candidates",
      buildHeaders(userId),
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    const { data } = await apiClient.get<any>(
      `/actors/${id}`,
      buildHeaders(userId),
    );
    res.status(200).json({ success: true, data });
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
      "/actors",
      req.body,
      buildHeaders(userId),
    );
    const actorId =
      typeof data === "number"
        ? data
        : typeof data?.id === "number"
          ? data.id
          : null;
    const hydrated =
      actorId !== null
        ? (await apiClient.get<any>(`/actors/${actorId}`, buildHeaders(userId)))
            .data
        : data;
    cache.flushAll();
    res.status(201).json({ success: true, data: hydrated });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    await apiClient.put<any>(`/actors/${id}`, req.body, buildHeaders(userId));
    const { data } = await apiClient.get<any>(
      `/actors/${id}`,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("/:id/archive", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    await apiClient.post<any>(
      `/actors/${id}/archive`,
      {},
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    await apiClient.post<any>(
      `/actors/${id}/restore`,
      {},
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.delete("/:id/hard", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    await apiClient.delete<any>(`/actors/${id}/hard`, buildHeaders(userId));
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("/:id/roles", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    await apiClient.post<any>(
      `/actors/${id}/roles`,
      req.body,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, message: "Operación exitosa" });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("/:id/aliases", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { id } = req.params;
    const { data } = await apiClient.post<any>(
      `/actors/${id}/aliases`,
      req.body,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    respondError(res, error);
  }
});

router.post("/merge", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data } = await apiClient.post<any>(
      "/actors/merge",
      req.body,
      buildHeaders(userId),
    );
    cache.flushAll();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    respondError(res, error);
  }
});

export default router;
