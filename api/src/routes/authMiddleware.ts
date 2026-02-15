import { Request, Response, NextFunction } from "express";

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
  rolID: string | null;
  hash: string;
  exp: number;
}

function decodeTokenPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader =
      typeof req.headers.authorization === "string"
        ? req.headers.authorization
        : "";
    const token = authHeader?.split(" ")[1];

    if (!token || token.trim() === "") {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const decoded = decodeTokenPayload(token);
    const subject = decoded?.sub || decoded?.ID || decoded?.id;
    if (!decoded || !subject || !decoded.exp) {
      res.status(401).json({ message: "Sesión inválida" });
      return;
    }

    const exp = Number(decoded.exp);
    if (!exp || exp <= Math.floor(Date.now() / 1000)) {
      res.status(401).json({ message: "Sesión expirada" });
      return;
    }

    req.user = {
      status: "active",
      userID: String(subject),
      rolID: decoded.Rol ? String(decoded.Rol) : null,
      hash: decoded.Hash ? String(decoded.Hash) : "",
      exp,
    };
    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({ message: "Error en autenticación" });
  }
};