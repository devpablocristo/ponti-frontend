import { describe, expect, it } from "vitest";
import { formatError } from "./formatError";
import { FetchApiError, wrapFetchResponse } from "@/api/fetchErrorAdapter";
import { HTTP_COPY } from "@/copy/http";

const FALLBACK = "No se pudo completar la operación.";

describe("formatError", () => {
  it("usa el mensaje del BE traducido cuando matchea un pattern conocido", () => {
    const err = {
      response: {
        status: 409,
        data: { error: { details: "lot is archived" } },
      },
      userMessage: "Ya existe un registro con esa información.", // interceptor genérico
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "El lote está archivado. Restaurálo o elegí uno activo.",
    );
  });

  it("usa userMessage del interceptor cuando el BE no devuelve mensaje", () => {
    const err = {
      response: { status: 500, data: {} },
      userMessage: "Ocurrió un error interno. Intentá nuevamente en unos minutos.",
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "Ocurrió un error interno. Intentá nuevamente en unos minutos.",
    );
  });

  it("usa el mensaje crudo del BE si no matchea pattern y no hay userMessage", () => {
    const err = {
      response: {
        data: { error: { details: "La superficie de cosecha supera la superficie del lote." } },
      },
    };
    // Mensaje ya en español del BE legacy: pasa intacto.
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "La superficie de cosecha supera la superficie del lote.",
    );
  });

  it("cae al fallback cuando no hay nada del BE ni del interceptor", () => {
    const err = new Error("boom");
    expect(formatError(err, { fallback: FALLBACK })).toBe(FALLBACK);
  });

  it("traduce 'X not found or outdated' a copy accionable", () => {
    const err = {
      response: { data: { error: { details: "customer not found or outdated" } } },
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "El cliente fue modificado por otra persona o ya no existe. Recargá la página y volvé a intentar.",
    );
  });

  it("traduce 'X already exists' por entidad", () => {
    const err = {
      response: { data: { error: { details: "campaign already exists" } } },
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "La campaña ya existe.",
    );
  });

  it("traduce BE work-order date validation", () => {
    const err = {
      response: { data: { error: { details: "work order date cannot be in the future" } } },
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "La fecha de la orden de trabajo no puede ser futura.",
    );
  });

  // Casos del nuevo adaptador Fetch (aiClient / insightsClient ahora pasan por acá).
  describe("FetchApiError (clientes Fetch no-axios)", () => {
    it("400 con body técnico de companion → no expone JSON crudo", async () => {
      const res = new Response('{"code":"VALIDATION_ERROR","message":"companion: bad request..."}', {
        status: 400,
      });
      const err = await wrapFetchResponse(res);
      const formatted = formatError(err, { fallback: FALLBACK });
      expect(formatted).toBe(HTTP_COPY.validation);
      expect(formatted).not.toContain("companion");
      expect(formatted).not.toContain("VALIDATION_ERROR");
      expect(formatted).not.toContain("bad request");
    });

    it("401 wrapped → mensaje de sesión expirada", async () => {
      const err = await wrapFetchResponse(new Response("", { status: 401 }));
      expect(formatError(err, { fallback: FALLBACK })).toBe(HTTP_COPY.unauthorized);
    });

    it("403 wrapped → mensaje de sin permisos", async () => {
      const err = await wrapFetchResponse(new Response("", { status: 403 }));
      expect(formatError(err, { fallback: FALLBACK })).toBe(HTTP_COPY.forbidden);
    });

    it("404 wrapped → mensaje recurso inexistente", async () => {
      const err = await wrapFetchResponse(new Response("", { status: 404 }));
      expect(formatError(err, { fallback: FALLBACK })).toBe(HTTP_COPY.notFound);
    });

    it("422 wrapped → mensaje de datos inválidos (mapping explícito)", async () => {
      const err = await wrapFetchResponse(new Response("", { status: 422 }));
      expect(formatError(err, { fallback: FALLBACK })).toBe(HTTP_COPY.validation);
    });

    it("500 wrapped → mensaje server error", async () => {
      const err = await wrapFetchResponse(new Response("", { status: 500 }));
      expect(formatError(err, { fallback: FALLBACK })).toBe(HTTP_COPY.serverError);
    });

    it("FetchApiError con backendMessage pattern conocido → traduce con translateBackendError", async () => {
      const res = new Response('{"message":"lot is archived"}', { status: 409 });
      const err = await wrapFetchResponse(res);
      // translateBackendError gana por encima de userMessage cuando hay match.
      expect(formatError(err, { fallback: FALLBACK })).toBe(
        "El lote está archivado. Restaurálo o elegí uno activo.",
      );
    });

    it("FetchApiError manual con userMessage en español → ese gana", () => {
      const err = new FetchApiError({
        technicalMessage: "fetch 500 ...",
        userMessage: "El asistente no pudo procesar tu mensaje.",
        status: 500,
      });
      expect(formatError(err, { fallback: FALLBACK })).toBe(
        "El asistente no pudo procesar tu mensaje.",
      );
    });
  });

  it("undefined / null → fallback", () => {
    expect(formatError(undefined, { fallback: FALLBACK })).toBe(FALLBACK);
    expect(formatError(null, { fallback: FALLBACK })).toBe(FALLBACK);
  });
});
