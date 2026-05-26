import { describe, expect, it } from "vitest";

import { HTTP_COPY } from "@/copy/http";
import { FetchApiError, wrapFetchNetworkError, wrapFetchResponse } from "./fetchErrorAdapter";

function makeResponse(status: number, body: string): Response {
  // En el test env de Node, `Response.url` queda "" por defecto; `wrapFetchResponse`
  // tolera eso y arma el technicalMessage sin url. Esto matchea el flujo real
  // donde Response.url tiene la URL completa.
  return new Response(body, {
    status,
    headers: { "Content-Type": body.startsWith("{") ? "application/json" : "text/plain" },
  });
}

describe("wrapFetchResponse", () => {
  it("400 → userMessage validation copy", async () => {
    const err = await wrapFetchResponse(makeResponse(400, '{"code":"VALIDATION_ERROR","message":"companion: bad request"}'));
    expect(err).toBeInstanceOf(FetchApiError);
    expect(err.userMessage).toBe(HTTP_COPY.validation);
    expect(err.response.status).toBe(400);
    expect(err.response.data.code).toBe("VALIDATION_ERROR");
    expect(err.response.data.message).toBe("companion: bad request");
  });

  it("401 → unauthorized copy", async () => {
    const err = await wrapFetchResponse(makeResponse(401, ""));
    expect(err.userMessage).toBe(HTTP_COPY.unauthorized);
  });

  it("403 → forbidden copy", async () => {
    const err = await wrapFetchResponse(makeResponse(403, '{"code":"FORBIDDEN"}'));
    expect(err.userMessage).toBe(HTTP_COPY.forbidden);
  });

  it("404 → notFound copy", async () => {
    const err = await wrapFetchResponse(makeResponse(404, ""));
    expect(err.userMessage).toBe(HTTP_COPY.notFound);
  });

  it("409 → conflict copy", async () => {
    const err = await wrapFetchResponse(makeResponse(409, ""));
    expect(err.userMessage).toBe(HTTP_COPY.conflict);
  });

  it("422 → validation copy (mapping explícito)", async () => {
    const err = await wrapFetchResponse(makeResponse(422, ""));
    expect(err.userMessage).toBe(HTTP_COPY.validation);
  });

  it("4xx genérico (e.g. 418) → validation copy", async () => {
    const err = await wrapFetchResponse(makeResponse(418, ""));
    expect(err.userMessage).toBe(HTTP_COPY.validation);
  });

  it("500 → serverError copy", async () => {
    const err = await wrapFetchResponse(makeResponse(500, '{"message":"upstream timeout"}'));
    expect(err.userMessage).toBe(HTTP_COPY.serverError);
  });

  it("503 → serverError copy", async () => {
    const err = await wrapFetchResponse(makeResponse(503, ""));
    expect(err.userMessage).toBe(HTTP_COPY.serverError);
  });

  it("body no JSON no rompe la construcción", async () => {
    const err = await wrapFetchResponse(makeResponse(500, "Internal Server Error (plain text)"));
    expect(err.userMessage).toBe(HTTP_COPY.serverError);
    expect(err.response.data.code).toBeUndefined();
    expect(err.response.data.message).toBeUndefined();
  });

  it("technicalMessage tiene status + body para logs (NO se muestra al user)", async () => {
    const err = await wrapFetchResponse(makeResponse(400, '{"message":"X"}'));
    expect(err.message).toContain("fetch 400");
    expect(err.message).toContain('{"message":"X"}');
    // Pero el user NO ve `err.message` — ve `err.userMessage` que es español.
    expect(err.userMessage).not.toContain("fetch 400");
  });
});

describe("wrapFetchNetworkError", () => {
  it("error genérico de fetch → network copy", () => {
    const err = wrapFetchNetworkError(new TypeError("Failed to fetch"));
    expect(err.userMessage).toBe(HTTP_COPY.network);
    expect(err.response.status).toBe(0);
  });

  it("TimeoutError → timeout copy", () => {
    class TimeoutErr extends Error {
      constructor() {
        super("timed out");
        this.name = "TimeoutError";
      }
    }
    const err = wrapFetchNetworkError(new TimeoutErr());
    expect(err.userMessage).toBe(HTTP_COPY.timeout);
  });

  it("string lanzado en lugar de Error", () => {
    const err = wrapFetchNetworkError("offline");
    expect(err).toBeInstanceOf(FetchApiError);
    expect(err.userMessage).toBe(HTTP_COPY.network);
  });
});

describe("FetchApiError shape (compat con extractErrorMessage / formatError)", () => {
  it("imita shape AxiosError (response.data.message extraíble)", async () => {
    const err = await wrapFetchResponse(makeResponse(409, '{"message":"actor has 3 active references"}'));
    // extractErrorMessage en useApiCall.ts lee err.response.data.message — debe
    // poder leer el mensaje del BE para que translateBackendError lo procese.
    expect(err.response.data.message).toBe("actor has 3 active references");
  });

  it("userMessage gana frente a backendMessage en formatError", async () => {
    // Caso del bug original: BE devuelve "companion: bad request..." y antes
    // se mostraba crudo. Ahora userMessage = HTTP_COPY.validation y gana.
    const err = await wrapFetchResponse(makeResponse(400, '{"message":"companion: bad request..."}'));
    expect(err.userMessage).toBe(HTTP_COPY.validation);
    expect(err.userMessage).not.toContain("companion");
    expect(err.userMessage).not.toContain("bad request");
  });
});
