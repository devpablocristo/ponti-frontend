import { Request, Response, Router } from "express";
import axios from "axios";

import { configService } from "../configService";

const router: Router = Router();

const identityToolkitBase = "https://identitytoolkit.googleapis.com/v1";
const secureTokenBase = "https://securetoken.googleapis.com/v1";

type LocalTokenPayload = {
  sub: string;
  email: string;
  Username: string;
  ID: number;
  Rol: number;
  iat: number;
  exp: number;
  token_use: "access" | "refresh";
};

const identityConfigured = () =>
  Boolean(
    configService.identityApiKey &&
      configService.identityProjectId &&
      !isPlaceholder(configService.identityApiKey) &&
      !isPlaceholder(configService.identityProjectId)
  );

const isPlaceholder = (value: string) =>
  value.trim().toLowerCase().startsWith("your-");

const usernameToEmail = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.includes("@")) return v;
  // Identity Platform email/password auth needs an email.
  // We support "username" by mapping deterministically to a synthetic email.
  return `${v}@ponti.local`;
};

const encodeBase64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createUnsignedJwt = (payload: LocalTokenPayload) =>
  `${encodeBase64Url({ alg: "none", typ: "JWT" })}.${encodeBase64Url(payload)}.`;

const decodeUnsignedJwtPayload = (token: string): LocalTokenPayload | null => {
  const [, payload] = String(token || "").split(".");
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const createLocalTokenPair = (email: string) => {
  const now = Math.floor(Date.now() / 1000);
  const username = email.split("@")[0] || "local-dev-user";
  const numericUserId = Number(configService.localDevUserId) || 1;
  const basePayload = {
    sub: `local:${email}`,
    email,
    Username: username,
    ID: numericUserId,
    Rol: 1,
    iat: now,
  };

  return {
    access_token: createUnsignedJwt({
      ...basePayload,
      exp: now + 60 * 60,
      token_use: "access",
    }),
    refresh_token: createUnsignedJwt({
      ...basePayload,
      exp: now + 30 * 24 * 60 * 60,
      token_use: "refresh",
    }),
  };
};

const respondWithLocalSession = (res: Response, email: string) => {
  res.status(200).json({
    success: true,
    message: "Operación exitosa",
    data: createLocalTokenPair(email),
  });
};

router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = usernameToEmail(req.body.email || req.body.username || "");
    const password = (req.body.password || "").trim();
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Credenciales inválidas",
        error: { status: 400, details: "email y password son requeridos" },
      });
      return;
    }

    if (configService.localDevAuth) {
      if (
        configService.localDevPassword &&
        password !== configService.localDevPassword
      ) {
        res.status(401).json({
          success: false,
          message: "Error de autenticación",
          error: { status: 401, details: "Credenciales locales inválidas" },
        });
        return;
      }

      respondWithLocalSession(res, email);
      return;
    }

    if (!identityConfigured()) {
      res.status(503).json({
        success: false,
        message: "Identity Platform no configurado",
        error: {
          status: 503,
          details:
            "Faltan IDENTITY_PLATFORM_API_KEY o IDENTITY_PLATFORM_PROJECT_ID",
        },
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
  if (configService.localDevAuth) {
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.split(" ")[1];
    const payload = decodeUnsignedJwtPayload(refreshToken || "");

    if (
      !payload ||
      payload.token_use !== "refresh" ||
      payload.exp * 1000 <= Date.now()
    ) {
      res.status(401).json({
        success: false,
        message: "No autorizado",
        error: { status: 401, details: "refresh token inválido" },
      });
      return;
    }

    respondWithLocalSession(res, payload.email);
    return;
  }

  if (!identityConfigured()) {
    res.status(503).json({
      success: false,
      message: "Identity Platform no configurado",
      error: {
        status: 503,
        details:
          "Faltan IDENTITY_PLATFORM_API_KEY o IDENTITY_PLATFORM_PROJECT_ID",
      },
    });
    return;
  }

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
  if (configService.localDevAuth) {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split(" ")[1];
    const payload = decodeUnsignedJwtPayload(idToken || "");

    if (
      !payload ||
      payload.token_use !== "access" ||
      payload.exp * 1000 <= Date.now()
    ) {
      res.status(401).json({
        success: false,
        message: "Sesión inválida",
        error: { status: 401, details: "Token inválido o expirado" },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Operación exitosa",
      data: { users: [payload] },
    });
    return;
  }

  if (!identityConfigured()) {
    res.status(503).json({
      success: false,
      message: "Identity Platform no configurado",
      error: {
        status: 503,
        details:
          "Faltan IDENTITY_PLATFORM_API_KEY o IDENTITY_PLATFORM_PROJECT_ID",
      },
    });
    return;
  }

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
