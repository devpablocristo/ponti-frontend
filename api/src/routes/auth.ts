import { Request, Response, Router } from "express";
import axios from "axios";

import { configService } from "../configService";

const router: Router = Router();

const identityToolkitBase = "https://identitytoolkit.googleapis.com/v1";
const secureTokenBase = "https://securetoken.googleapis.com/v1";

const identityConfigured = () =>
  Boolean(configService.identityApiKey && configService.identityProjectId);

const localDevAuthEnabled = () => process.env.LOCAL_DEV_AUTH === "1";

function base64url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeFakeJWT(payload: Record<string, any>) {
  const header = { alg: "none", typ: "JWT" };
  return `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}.x`;
}

const usernameToEmail = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.includes("@")) return v;
  // Identity Platform email/password auth needs an email.
  // We support "username" by mapping deterministically to a synthetic email.
  return `${v}@ponti.local`;
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

    // Local dev mode: emulate login without calling Identity Platform.
    // This keeps `make run-ponti-local` working without any GCP setup.
    if (localDevAuthEnabled()) {
      const now = Math.floor(Date.now() / 1000);
      const userID = process.env.LOCAL_DEV_USER_ID || "1";
      const accessToken = makeFakeJWT({
        sub: String(userID),
        email,
        exp: now + 60 * 60, // 1h
      });
      const refreshToken = makeFakeJWT({
        sub: String(userID),
        email,
        exp: now + 7 * 24 * 60 * 60, // 7d
      });
      res.status(200).json({
        success: true,
        message: "Operación exitosa",
        data: { access_token: accessToken, refresh_token: refreshToken },
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
  if (localDevAuthEnabled()) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    const now = Math.floor(Date.now() / 1000);
    // Keep same sub if possible
    let sub = process.env.LOCAL_DEV_USER_ID || "1";
    try {
      const payload = token?.split(".")?.[1];
      if (payload) {
        const decoded = JSON.parse(
          Buffer.from(payload, "base64url").toString("utf8")
        );
        if (decoded?.sub) sub = String(decoded.sub);
      }
    } catch {
      // ignore
    }
    const accessToken = makeFakeJWT({ sub, exp: now + 60 * 60 });
    res.status(200).json({
      success: true,
      message: "Operación exitosa",
      data: { access_token: accessToken, refresh_token: token || "" },
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
  if (localDevAuthEnabled()) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (!token) {
      res.status(401).json({
        success: false,
        message: "No autorizado",
        error: { status: 401, details: "token requerido" },
      });
      return;
    }
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
      res.status(200).json({
        success: true,
        message: "Operación exitosa",
        data: { users: [decoded] },
      });
      return;
    } catch {
      res.status(401).json({
        success: false,
        message: "Sesión inválida",
        error: { status: 401, details: "Token inválido" },
      });
      return;
    }
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
