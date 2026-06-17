import { Request } from "express";

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return firstQueryValue(value[0]);
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function getTenantHeader(req: Request): string | undefined {
  const raw = req.headers["x-tenant-id"];
  const value = firstQueryValue(raw);
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function buildCoreAuthHeaders(
  req: Request,
  apiKey: string,
): Record<string, string> | null {
  const userId = req.user?.userID;
  if (!userId) return null;

  const headers: Record<string, string> = {
    "X-API-KEY": apiKey,
    "X-User-Id": userId,
  };
  const tenantID = getTenantHeader(req);
  if (tenantID) {
    headers["X-Tenant-Id"] = tenantID;
  }
  const authorization = firstQueryValue(req.headers.authorization);
  if (authorization) {
    headers.Authorization = authorization;
  }
  return headers;
}
