import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { configService } from "../configService";
import { requestContext } from "../requestContext";

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

export function decodeTokenPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

type VerifiedIdentity = {
  subject: string;
  email?: string;
  exp: number;
  role?: string | null;
  hash?: string;
};

const verifiedTokenCache = new Map<string, VerifiedIdentity>();

function mapDecodedToken(decoded: Record<string, any> | null): VerifiedIdentity | null {
  const subject = decoded?.sub || decoded?.ID || decoded?.id;
  if (!decoded || !subject || !decoded.exp) {
    return null;
  }
  const exp = Number(decoded.exp);
  if (!exp || exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return {
    subject: String(subject),
    email: decoded.email ? String(decoded.email) : undefined,
    exp,
    role: decoded.Rol ? String(decoded.Rol) : null,
    hash: decoded.Hash ? String(decoded.Hash) : "",
  };
}

async function verifyWithIdentityPlatform(token: string): Promise<VerifiedIdentity | null> {
  const cached = verifiedTokenCache.get(token);
  if (cached && cached.exp > Math.floor(Date.now() / 1000)) {
    return cached;
  }

  if (!configService.identityApiKey || !configService.identityProjectId) {
    throw new Error("Identity Platform no configurado");
  }

  const decoded = mapDecodedToken(decodeTokenPayload(token));
  if (!decoded) {
    return null;
  }

  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${configService.identityApiKey}`,
    { idToken: token },
    { timeout: 10000 },
  );
  const users = Array.isArray(response.data?.users) ? response.data.users : [];
  const user = users[0];
  if (!user?.localId || String(user.localId) !== decoded.subject) {
    return null;
  }

  const verified: VerifiedIdentity = {
    ...decoded,
    email: user.email ? String(user.email) : decoded.email,
  };
  verifiedTokenCache.set(token, verified);
  return verified;
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

    const verified = configService.allowLocalDevAuth()
      ? mapDecodedToken(decodeTokenPayload(token))
      : await verifyWithIdentityPlatform(token);

    if (!verified) {
      res.status(401).json({ message: "Sesión inválida" });
      return;
    }
    req.user = {
      status: "active",
      userID: verified.subject,
      rolID: verified.role || null,
      hash: verified.hash || "",
      exp: verified.exp,
    };
    requestContext.setUserId(verified.subject);
    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({ message: "Error en autenticación" });
  }
};
