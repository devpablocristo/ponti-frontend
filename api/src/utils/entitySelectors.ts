import { Request } from "express";

type CacheLike = {
  keys(): string[];
  del(keys: string | string[]): number;
};

const SELECTOR_PREFIXES = [
  "customers:",
  "campaigns:",
  "form-options:",
  "projects:",
  "project:",
  "customers",
  "options",
];

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

export function requestScope(req: Request): string {
  return getTenantHeader(req) || req.user?.userID || "anonymous";
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

export function buildForwardQuery(
  query: Request["query"],
  opts: { limitAsPerPage?: boolean } = {},
): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const value = firstQueryValue(raw);
    if (value == null || value.trim() === "") continue;
    if (key === "limit" && opts.limitAsPerPage && !query.per_page) {
      params.set("per_page", value);
      continue;
    }
    params.set(key, value);
  }
  return params.toString();
}

export function scopedCacheKey(resource: string, req: Request, queryString = ""): string {
  return `${resource}:${requestScope(req)}:${queryString}`;
}

export function flushEntitySelectorCaches(cache: CacheLike): void {
  const keys = cache.keys().filter((key) =>
    SELECTOR_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix)),
  );
  if (keys.length > 0) {
    cache.del(keys);
  }
}
