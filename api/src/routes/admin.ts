import { Request, Response, Router } from "express";
import { ApiClient, ApiResponse } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseManagerApi);
const router: Router = Router();

const headersFor = (req: Request) => ({
  "X-API-KEY": configService.apiKey,
  // Backend no depende de este header para IDP, pero es consistente con el resto.
  "X-User-Id": req.user?.userID ? String(req.user.userID) : "",
});

router.get("/tenants", async (req: Request, res: Response) => {
  try {
    const data = await apiClient.get<any>("/admin/tenants", headersFor(req));
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

router.post("/tenants", async (req: Request, res: Response) => {
  try {
    const data = await apiClient.post<any>("/admin/tenants", req.body, headersFor(req));
    res.status(201).json(data);
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

router.get("/users", async (req: Request, res: Response) => {
  try {
    const data = await apiClient.get<any>("/admin/users", headersFor(req));
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

router.post("/users", async (req: Request, res: Response) => {
  try {
    const data = await apiClient.post<any>("/admin/users", req.body, headersFor(req));
    res.status(201).json(data);
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

router.post("/memberships", async (req: Request, res: Response) => {
  try {
    const data = await apiClient.post<any>(
      "/admin/memberships",
      req.body,
      headersFor(req)
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

export default router;

