import { Router } from "express";
import { configService } from "../configService";
import { ApiClient } from "../clients/ApiClient";

const router = Router();
const apiClient = new ApiClient(configService.baseManagerApi);

router.get("/context", async (_req, res) => {
  try {
    const response = await apiClient.get("/me/context", {
      "X-API-KEY": configService.apiKey,
    });
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(error?.error?.status || 500).json({
      message: error?.error?.details || "No se pudo obtener el contexto de usuario",
    });
  }
});

export default router;
