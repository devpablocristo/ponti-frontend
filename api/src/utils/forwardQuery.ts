import type { Request } from "express";

const DEFAULT_PAGE = "1";
const DEFAULT_PER_PAGE = "1000";

export function buildForwardQuery(req: Request): string {
  const params = new URLSearchParams();
  const source = req.query ?? {};

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item) !== "") {
          params.append(key, String(item));
        }
      });
      return;
    }
    const normalized = String(value);
    if (normalized !== "") {
      params.set(key, normalized);
    }
  });

  if (!params.has("page")) params.set("page", DEFAULT_PAGE);
  if (!params.has("per_page")) params.set("per_page", DEFAULT_PER_PAGE);

  const query = params.toString();
  return query ? `?${query}` : "";
}
