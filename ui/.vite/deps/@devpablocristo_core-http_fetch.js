import "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/core-http/src/fetch.ts
var HttpError = class extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "HttpError";
  }
};
function normalizeBaseURLs(options) {
  const explicit = (options.baseURLs ?? []).map((value) => value.trim()).filter(Boolean);
  if (explicit.length > 0) {
    return [...new Set(explicit)];
  }
  return [""];
}
function joinURL(baseURL, path) {
  if (!baseURL) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleanBase = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
async function readError(response) {
  const text = await response.text().catch(() => response.statusText);
  let message = text || response.statusText || `HTTP ${response.status}`;
  if (text) {
    try {
      const body = JSON.parse(text);
      if ((body == null ? void 0 : body.error) && typeof body.error === "object") {
        message = body.error.message || body.error.code || message;
      } else if (typeof (body == null ? void 0 : body.error) === "string") {
        message = body.error;
      } else if (body == null ? void 0 : body.message) {
        message = body.message;
      }
    } catch {
    }
  }
  return new HttpError(message, response.status, text);
}
async function requestResponse(path, options = {}) {
  const headers = {
    ...options.headers ?? {}
  };
  if (!options.skipJSONContentType && !("Content-Type" in headers) && !(typeof FormData !== "undefined" && options.rawBody instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const requestBody = options.rawBody ?? (options.body !== void 0 ? JSON.stringify(options.body) : void 0);
  let lastError = null;
  for (const baseURL of normalizeBaseURLs(options)) {
    try {
      const response = await fetch(joinURL(baseURL, path), {
        method: options.method ?? "GET",
        headers,
        body: requestBody
      });
      if (!response.ok) {
        throw await readError(response);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("No se pudo completar la solicitud");
}
async function request(path, options = {}) {
  const response = await requestResponse(path, options);
  if (response.status === 204) {
    return void 0;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}
export {
  HttpError,
  request,
  requestResponse
};
//# sourceMappingURL=@devpablocristo_core-http_fetch.js.map
