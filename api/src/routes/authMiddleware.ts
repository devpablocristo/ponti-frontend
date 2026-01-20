import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
//import redis from "../clients/redisClient";

import { ApiClient } from "../clients/ApiClient";
import { configService } from "../configService";

const apiClient = new ApiClient(configService.baseLoginApi);

const AUTH_API_URL = "/auth/validate-token";
const REFRESH_API_URL = "/auth/access-token";

declare global {
  namespace Express {
    interface Request {
      user?: UserData;
    }
  }
}

export interface UserData {
  status: string;
  userID: string;
  rolID: string;
  hash: string;
  exp: number;
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    
    if (!token || token.trim() === "") {
      console.log("Token vacío o no proporcionado. Header:", authHeader);
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    console.log("Token recibido (primeros 20 chars):", token.substring(0, 20));

    // En desarrollo, verificar el token localmente
    const secretKey = process.env.JWT_SECRET;
    if (secretKey && process.env.NODE_ENV === "development") {
      try {
        const decoded = jwt.verify(token, secretKey) as any;
        req.user = {
          status: "active",
          userID: decoded.id,
          rolID: decoded.rolId,
          hash: decoded.hash || "",
          exp: decoded.exp,
        };
        next();
        return;
      } catch (jwtError: any) {
        console.error("Error validando JWT:", jwtError.message);
        // Continuar con validación externa si JWT falla
      }
    }

    // Fallback: validar contra API externa
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const { data, success } = await apiClient.get<UserData>(
        AUTH_API_URL,
        headers
      );

      if (success) {
        req.user = data;
        next();
        return;
      }
    } catch (error) {
      console.error("Error validando el token:", error);
    }

    res.status(401).json({ message: "Sesión inválida" });
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({ message: "Error en autenticación" });
  }
};