import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { parsePartialPriceFlag } from "../utils/partialPrice";
import { configService } from "../configService";
import { cache } from ".";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

const getAuthHeaders = (userId: string) => ({
  "X-API-KEY": configService.apiKey,
  "X-User-Id": userId,
});

const parsePositiveInt = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const appendPositiveInt = (params: URLSearchParams, key: string, value: unknown) => {
  const parsed = parsePositiveInt(value);
  if (parsed > 0) params.set(key, String(parsed));
};

const buildLaborWorkspaceParams = (
  req: Request,
  options: { projectId?: number; includePagination?: boolean; includeUsdMonth?: boolean } = {},
) => {
  const params = new URLSearchParams();

  if (options.projectId && options.projectId > 0) {
    params.set("project_id", String(options.projectId));
  }
  appendPositiveInt(params, "customer_id", req.query.customer_id);
  appendPositiveInt(params, "project_id", req.query.project_id);
  appendPositiveInt(params, "campaign_id", req.query.campaign_id);
  appendPositiveInt(params, "field_id", req.query.field_id);

  if (options.includeUsdMonth) {
    params.set("usd_month", String(new Date().getMonth() + 1));
  }
  if (options.includePagination) {
    params.set("page", String(parsePositiveInt(req.query.page) || 1));
    params.set("per_page", String(parsePositiveInt(req.query.per_page) || 1000));
  }

  return params;
};

const pathWithQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

router.post("/invoice", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    if (!req.body.workorder_id || req.body.workorder_id === 0) {
      res.status(400).json({ message: "El id de la orden es obligatorio" });
      return;
    }

        if (!req.body.investor_id || req.body.investor_id === 0) {
      res.status(400).json({ message: "El id del inversor es obligatorio" });
      return;
    }

    if (!req.body.invoice_number || req.body.invoice_number === 0) {
      res
        .status(400)
        .json({ message: "El número de la factura es obligatorio" });
      return;
    }

    if (!req.body.invoice_date) {
      res
        .status(400)
        .json({ message: "La fecha de la factura es obligatoria" });
      return;
    }

    if (!req.body.invoice_company) {
      res
        .status(400)
        .json({ message: "La empresa de la factura es obligatoria" });
      return;
    }

    if (!req.body.invoice_status) {
      res
        .status(400)
        .json({ message: "El estado de la factura es obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const requestData = {
      number: req.body.invoice_number,
      date: req.body.invoice_date + "T00:00:00Z",
      company: req.body.invoice_company,
      status: req.body.invoice_status,
    };

        const { data: invoice } = await apiClient.post<any>(
      `/invoices/${req.body.workorder_id}?investor_id=${req.body.investor_id}`,
      requestData,
      headers,
    );

    setImmediate(() => cache.flushAll());

    const data = {
      success: true,
      data: invoice,
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

router.put("/invoice/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    if (!req.body.workorder_id || req.body.workorder_id === 0) {
      res.status(400).json({ message: "El id de la orden es obligatorio" });
      return;
    }

        if (!req.body.investor_id || req.body.investor_id === 0) {
      res.status(400).json({ message: "El id del inversor es obligatorio" });
      return;
    }

    if (!req.body.invoice_number || req.body.invoice_number === 0) {
      res
        .status(400)
        .json({ message: "El número de la factura es obligatorio" });
      return;
    }

    if (!req.body.invoice_date) {
      res
        .status(400)
        .json({ message: "La fecha de la factura es obligatoria" });
      return;
    }

    if (!req.body.invoice_company) {
      res
        .status(400)
        .json({ message: "La empresa de la factura es obligatoria" });
      return;
    }

    if (!req.body.invoice_status) {
      res
        .status(400)
        .json({ message: "El estado de la factura es obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const requestData = {
      number: req.body.invoice_number,
      date: req.body.invoice_date + "T00:00:00Z",
      company: req.body.invoice_company,
      status: req.body.invoice_status,
    };

        await apiClient.put<any>(
      `/invoices/${req.body.workorder_id}?investor_id=${req.body.investor_id}`,
      requestData,
      headers,
    );

    setImmediate(() => cache.flushAll());

    const data = {
      success: true,
      message: "Factura actualizada exitosamente",
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

router.get("/metrics/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const headers = getAuthHeaders(userId);
    const projectId = parsePositiveInt(req.params.id);
    const params = buildLaborWorkspaceParams(req, { projectId });

    const { data: metrics } = await apiClient.get<any>(
      pathWithQuery("/labors/metrics", params),
      headers,
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

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const { data: metrics } = await apiClient.get<any>(
      pathWithQuery("/labors/metrics", buildLaborWorkspaceParams(req)),
      getAuthHeaders(userId),
    );

    res.status(200).json({
      success: true,
      data: metrics,
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

router.get("/export/:id", async (req, res) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.id as string) || 0;
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const response = await apiClient.get<any>(
      `/labors/export/${project_id}?usd_month=${new Date().getMonth() + 1}`,
      { headers, responseType: "arraybuffer" },
    );

    res.setHeader("Content-Disposition", 'attachment; filename="labores.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
      error: { status: 500, details: "Error al exportar labores" },
    });
  }
});

router.get("/database-export/:id", async (req, res) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.id as string) || 0;
    if (project_id === 0) {
      res.status(400).json({ message: "Proyecto obligatorio" });
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const response = await apiClient.get<any>(
      `/labors/export/all?project_id=${project_id}&usd_month=${new Date().getMonth() + 1}`,
      { headers, responseType: "arraybuffer" },
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="laboresdb.xlsx"',
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
      error: { status: 500, details: "Error al exportar labores" },
    });
  }
});

router.get(
  "/workorders-count/:project_id/:labor_id",
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userID;
      if (!userId) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
      }

      const project_id = parseInt(req.params.project_id as string) || 0;
      const labor_id = parseInt(req.params.labor_id as string) || 0;

      if (project_id === 0 || labor_id === 0) {
        res.status(400).json({ message: "Proyecto y labor obligatorios" });
        return;
      }

      const headers = {
        "X-API-KEY": configService.apiKey,
        "X-User-Id": userId,
      };

      const { data } = await apiClient.get<any>(
        `/projects/${project_id}/labors/${labor_id}/workorders-count`,
        headers,
      );

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      const err = error as ApiResponse<null>;
      if ("error" in err) {
        res.status(err.error?.status || 500).json(err);
        return;
      }
      res.status(500).json({
        success: false,
        error: { status: 500, details: "Error al obtener conteo" },
      });
    }
  },
);

router.get("/group", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const params = buildLaborWorkspaceParams(req, {
      includePagination: true,
      includeUsdMonth: true,
    });
    const cacheKey = `labors:group:${params.toString()}`;
    const cachedLabors = cache.get(cacheKey);
    if (cachedLabors) {
      res.status(200).json(cachedLabors);
      return;
    }

    const { data: labors } = await apiClient.get<any>(
      pathWithQuery("/labors/group", params),
      getAuthHeaders(userId),
    );

    const data = {
      success: true,
      data: {
        data: labors.data,
        page_info: labors.page_info,
      },
    };

    setImmediate(() => cache.set(cacheKey, data));

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

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const project_id = parseInt(req.params.id as string) || 0;

    const field_id = parseInt(req.query.field_id as string) || 0;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 1000;

    if (field_id === 0 && project_id === 0) {
      res.status(400).json({ message: "Campo o proyecto obligatorio" });
      return;
    }

    let query = `?usd_month=${new Date().getMonth() + 1}&page=${page}&per_page=${perPage}`;
    if (field_id !== 0) {
      query += `&field_id=${field_id}`;
    }

    const cachedLabors = cache.get(
      `labors:project:${project_id}:query:${query}`,
    );
    if (cachedLabors) {
      res.status(200).json(cachedLabors);
      return;
    }

    const headers = {
      "X-API-KEY": configService.apiKey,
      "X-User-Id": userId,
    };

    const { data: labors } = await apiClient.get<any>(
      `/labors/group/${project_id}${query}`,
      headers,
    );

    const data = {
      success: true,
      data: {
        data: labors.data,
        page_info: labors.page_info,
      },
    };

    setImmediate(() =>
      cache.set(`labors:project:${project_id}:query:${query}`, data),
    );

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

router.delete("/:id", async (req: Request, res: Response) => {
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

    await apiClient.delete<any>(`/labors/${req.params.id}`, headers);

    const data = {
      success: true,
      message: "Labor eliminada exitosamente",
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

router.put("/projects/:project_id/:id", async (req: Request, res: Response) => {
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
      id: req.body.id,
      name: req.body.name,
      category_id: req.body.category_id,
      price: req.body.price,
      contractor_name: req.body.contractor_name,
      is_partial_price: parsePartialPriceFlag(req.body.is_partial_price),
    };

    await apiClient.put<any>(
      `projects/${req.params.project_id}/labors/${req.params.id}`,
      requestData,
      headers,
    );

    setImmediate(() => cache.flushAll());

    const data = {
      success: true,
      message: "Labor actualizada exitosamente",
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

router.get(
  "/projects/:project_id/archived",
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userID;
      if (!userId) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
      }
      const project_id = parseInt(req.params.project_id as string) || 0;
      if (project_id === 0) {
        res.status(400).json({ message: "Proyecto obligatorio" });
        return;
      }
      const headers = {
        "X-API-KEY": configService.apiKey,
        "X-User-Id": userId,
      };
      const { data: labors } = await apiClient.get<any>(
        `/projects/${project_id}/labors/archived`,
        headers,
      );
      const items = Array.isArray(labors?.data) ? labors.data : [];
      const total =
        typeof labors?.page_info?.total === "number"
          ? labors.page_info.total
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
  },
);

router.post("/:labor_id/archive", async (req: Request, res: Response) => {
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
    await apiClient.post<any>(
      `/labors/${req.params.labor_id}/archive`,
      {},
      headers,
    );
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

router.post("/:labor_id/restore", async (req: Request, res: Response) => {
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
    await apiClient.post<any>(
      `/labors/${req.params.labor_id}/restore`,
      {},
      headers,
    );
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

router.delete("/:labor_id/hard", async (req: Request, res: Response) => {
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
    await apiClient.delete<any>(
      `/labors/${req.params.labor_id}/hard`,
      headers,
    );
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
