import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseManagerApi, 60000);

const router: Router = Router();

router.get("/costs-check", async (req: Request, res: Response) => {
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

    const projectId = req.query?.project_id as string;
    const params: Record<string, string> = {};

    if (projectId) {
      params.project_id = projectId;
    }

    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams
      ? `data-integrity/costs-check?${queryParams}`
      : "data-integrity/costs-check";

    const { data: report } = await apiClient.get<any>(url, headers);

    res.status(200).json(report);
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
