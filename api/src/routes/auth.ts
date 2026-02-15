import { Request, Response, Router } from "express";
import axios from "axios";

import { configService } from "../configService";

const router: Router = Router();

const identityToolkitBase = "https://identitytoolkit.googleapis.com/v1";
const secureTokenBase = "https://securetoken.googleapis.com/v1";

router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = (req.body.email || req.body.username || "").trim();
    const password = (req.body.password || "").trim();
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Credenciales inválidas",
        error: { status: 400, details: "email y password son requeridos" },
      });
      return;
    }

    const { data } = await axios.post(
      `${identityToolkitBase}/accounts:signInWithPassword?key=${configService.identityApiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
      { timeout: 15000 }
    );

    res.status(200).json({
      success: true,
      message: "Operación exitosa",
      data: {
        access_token: data.idToken,
        refresh_token: data.refreshToken,
      },
    });
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status || 401
      : 500;
    res.status(status).json({
      success: false,
      message: "Error de autenticación",
      error: {
        status,
        details: "No se pudo iniciar sesión con Identity Platform",
      },
    });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  // Identity Platform no requiere logout server-side en este flujo.
  res.status(200).json({
    success: true,
    message: "Operación exitosa",
    data: { logged_out: true },
  });
});

router.get("/access-token", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.split(" ")[1];
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "No autorizado",
        error: { status: 401, details: "refresh token requerido" },
      });
      return;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const { data } = await axios.post(
      `${secureTokenBase}/token?key=${configService.identityApiKey}`,
      body.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    res.status(200).json({
      success: true,
      message: "Operación exitosa",
      data: {
        access_token: data.id_token,
        refresh_token: data.refresh_token,
      },
    });
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status || 401
      : 500;
    res.status(status).json({
      success: false,
      message: "No autorizado",
      error: { status, details: "No se pudo refrescar el token" },
    });
  }
});

router.get("/session", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split(" ")[1];
    if (!idToken) {
      res.status(401).json({
        success: false,
        message: "No autorizado",
        error: { status: 401, details: "token requerido" },
      });
      return;
    }

    const { data } = await axios.post(
      `${identityToolkitBase}/accounts:lookup?key=${configService.identityApiKey}`,
      { idToken },
      { timeout: 15000 }
    );

    res.status(200).json({
      success: true,
      message: "Operación exitosa",
      data,
    });
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status || 401
      : 500;
    res.status(status).json({
      success: false,
      message: "Sesión inválida",
      error: { status, details: "Token inválido o expirado" },
    });
  }
});

export default router;
