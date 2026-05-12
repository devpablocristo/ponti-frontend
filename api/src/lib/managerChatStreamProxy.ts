/**
 * Proxy HTTP POST → SSE (una sola responsabilidad: BFF → ponti-backend).
 *
 * Divide y vencerás (cada invariante explícita):
 * 1) Cuerpo JSON ya materializado (string) — no compartir Readable del request con el cliente saliente.
 * 2) Sin agente HTTP compartido — evita sockets en estado raro con streams largos.
 * 3) Socket sin timeout de inactividad — el LLM puede tardar minutos entre chunks.
 * 4) flushHeaders() — el cliente (y Vite) reciben status + headers antes del primer byte del cuerpo (SSE).
 * 5) pipeline() — propagación y cierre ordenado de streams (Node recomendado vs pipe suelto).
 * 6) Si el navegador corta → destruir upstream para no dejar colgado al backend.
 */

import type { Request, Response } from "express";
import http from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { URL } from "node:url";

export type ManagerChatStreamParams = {
  managerBaseUrl: string;
  path: string;
  apiKey: string;
  userId: string;
  tenantId: string;
  projectId: string;
  jsonBody: unknown;
  authorization?: string;
};

export async function proxyManagerChatStreamPost(
  req: Request,
  res: Response,
  p: ManagerChatStreamParams
): Promise<void> {
  const bodyStr = JSON.stringify(p.jsonBody ?? {});
  const base = p.managerBaseUrl.replace(/\/$/, "");
  const target = new URL(`${base}${p.path.startsWith("/") ? p.path : `/${p.path}`}`);
  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;
  const defaultPort = isHttps ? 443 : 80;
  const port = target.port ? Number(target.port) : defaultPort;

  const headers: http.OutgoingHttpHeaders = {
    "X-API-KEY": p.apiKey,
    "X-User-Id": p.userId,
    "X-Tenant-Id": p.tenantId,
    "X-Project-Id": p.projectId,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(bodyStr, "utf8"),
    Accept: "*/*",
  };
  if (p.authorization) {
    headers.Authorization = p.authorization;
  }

  const opts: http.RequestOptions = {
    hostname: target.hostname,
    port,
    path: `${target.pathname}${target.search}`,
    method: "POST",
    headers,
    agent: false,
  };

  const upMsg = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const upstream = lib.request(opts, resolve);
    upstream.setTimeout(0);
    upstream.on("error", reject);
    upstream.on("timeout", () => {
      upstream.destroy(new Error("upstream socket timeout"));
    });
    upstream.write(bodyStr);
    upstream.end();
  });

  const sc = upMsg.statusCode ?? 500;
  const ct = upMsg.headers["content-type"];
  if (typeof ct === "string") {
    res.setHeader("Content-Type", ct);
  } else if (Array.isArray(ct) && ct[0]) {
    res.setHeader("Content-Type", ct[0]);
  } else {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  }
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(sc);

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const destroyUpstream = () => {
    upMsg.destroy();
  };
  req.once("close", destroyUpstream);
  req.socket?.once("error", destroyUpstream);

  try {
    await pipeline(upMsg, res);
  } finally {
    req.off("close", destroyUpstream);
    req.socket?.off("error", destroyUpstream);
  }
}
