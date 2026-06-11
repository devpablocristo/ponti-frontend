import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseManagerApi);

const router: Router = Router();

router.get("/field-crop", async (req: Request, res: Response) => {
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

    const customerId = req.query?.customer_id as string;
    const projectId = req.query?.project_id as string;
    const campaign_id = req.query?.campaign_id as string;

    const params: Record<string, string> = {};

    if (customerId) {
      params.customer_id = customerId;
    }
    if (projectId) {
      params.project_id = projectId;
    }

    if (campaign_id) {
      params.campaign_id = campaign_id;
    }

    const queryParams = new URLSearchParams(params).toString();

    const url = `reports/field-crop?${ queryParams }`;

    const { data: report } = await apiClient.get<any>(url, headers);

    const data = {
      success: true,
      data: report,
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

router.get("/investor-contribution", async (req: Request, res: Response) => {
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

    const customerId = req.query?.customer_id as string;
    const projectId = req.query?.project_id as string;
    const campaign_id = req.query?.campaign_id as string;

    const params: Record<string, string> = {};

    if (customerId) {
      params.customer_id = customerId;
    }
    if (projectId) {
      params.project_id = projectId;
    }

    if (campaign_id) {
      params.campaign_id = campaign_id;
    }

    const queryParams = new URLSearchParams(params).toString();

    const url = `reports/investor-contribution?${ queryParams }`;

    const { data: report } = await apiClient.get<any>(url, headers);

    const data = {
      success: true,
      data: report,
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

router.get("/summary-results", async (req: Request, res: Response) => {
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

    const customerId = req.query?.customer_id as string;
    const projectId = req.query?.project_id as string;
    const campaign_id = req.query?.campaign_id as string;

    const params: Record<string, string> = {};

    if (customerId) {
      params.customer_id = customerId;
    }
    if (projectId) {
      params.project_id = projectId;
    }

    if (campaign_id) {
      params.campaign_id = campaign_id;
    }

    const queryParams = new URLSearchParams(params).toString();

    const url = `reports/summary-results?${ queryParams }`;

    const { data: report } = await apiClient.get<any>(url, headers);

    const data = {
      success: true,
      data: report,
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

export default router;
