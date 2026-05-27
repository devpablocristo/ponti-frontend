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
      "Ya existe una campaña con ese nombre.",
    );
  });

  it("prioriza el duplicado del BE por encima del copy HTTP genérico", () => {
    const err = {
      response: {
        status: 409,
        data: { error: { details: "customer already exists" } },
      },
      userMessage: HTTP_COPY.conflict,
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "Ya existe un cliente con ese nombre.",
    );
  });

  it("lee error.message anidado y no cae al 500 genérico", () => {
    const err = {
      response: {
        status: 500,
        data: { error: { message: "failed to rename customer" } },
      },
      userMessage: HTTP_COPY.serverError,
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "No se pudo cambiar el nombre del cliente porque ya existe otro cliente con ese nombre.",
    );
  });

  it("mapea violaciones unique de customers aunque lleguen como 500", () => {
    const err = {
      response: {
        status: 500,
        data: {
          error: {
            message:
              'duplicate key value violates unique constraint "uq_customers_name"',
          },
        },
      },
      userMessage: HTTP_COPY.serverError,
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "Ya existe un cliente con ese nombre.",
    );
  });

  it("mapea el fallo real de link customer-actor aunque llegue como 500", () => {
    const err = {
      response: {
        status: 500,
        data: { error: { message: "failed to link customer to actor" } },
      },
      userMessage: HTTP_COPY.serverError,
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "No se pudo guardar porque el cliente está vinculado a otro actor. Seleccioná el cliente correcto desde la lista.",
    );
  });

  it("mapea el conflicto de link customer-actor devuelto como 409", () => {
    const err = {
      response: {
        status: 409,
        data: { error: { message: "customer actor link already exists" } },
      },
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "No se pudo guardar porque el cliente está vinculado a otro actor. Seleccioná el cliente correcto desde la lista.",
    );
  });

  it("traduce dependencias activas al eliminar definitivamente", () => {
    const err = {
      response: {
        status: 409,
        data: {
          error: {
            details: "project has 2 active field(s); archive or hard-delete them first",
          },
        },
      },
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "El proyecto tiene 2 campos activos asociados. Archivá o eliminá primero esos registros.",
    );
  });

  it("traduce bloqueo de archivo de inversor por asignaciones activas", () => {
    const err = {
      response: {
        status: 409,
        data: {
          error: {
            details: "investor has 1 active assignment(s); remove them first",
          },
        },
      },
      userMessage: HTTP_COPY.conflict,
    };
    expect(formatError(err, { fallback: FALLBACK })).toBe(
      "El inversor tiene 1 asignación activa en proyectos, campos, órdenes o costo administrativo. Quitá esas asignaciones antes de archivarlo.",
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
