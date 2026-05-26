import { describe, expect, it } from "vitest";
import { classifyHttpError, httpErrorCopy } from "./http";

describe("classifyHttpError", () => {
  it("detecta timeout por code ECONNABORTED", () => {
    expect(classifyHttpError({ code: "ECONNABORTED" })).toBe("timeout");
  });

  it("detecta network error por code ERR_NETWORK", () => {
    expect(classifyHttpError({ code: "ERR_NETWORK" })).toBe("network");
  });

  it("detecta network error cuando hay request pero no response", () => {
    expect(classifyHttpError({ request: {} })).toBe("network");
  });

  it("clasifica 401 como unauthorized", () => {
    expect(classifyHttpError({ response: { status: 401 } })).toBe("unauthorized");
  });

  it("clasifica 403 como forbidden", () => {
    expect(classifyHttpError({ response: { status: 403 } })).toBe("forbidden");
  });

  it("clasifica 404 como notFound", () => {
    expect(classifyHttpError({ response: { status: 404 } })).toBe("notFound");
  });

  it("clasifica 409 como conflict", () => {
    expect(classifyHttpError({ response: { status: 409 } })).toBe("conflict");
  });

  it("clasifica 4xx no especificado como validation", () => {
    expect(classifyHttpError({ response: { status: 422 } })).toBe("validation");
  });

  it("clasifica 5xx como serverError", () => {
    expect(classifyHttpError({ response: { status: 500 } })).toBe("serverError");
    expect(classifyHttpError({ response: { status: 503 } })).toBe("serverError");
  });

  it("retorna null para errores no axios-like", () => {
    expect(classifyHttpError(new Error("boom"))).toBe(null);
    expect(classifyHttpError(null)).toBe(null);
    expect(classifyHttpError(undefined)).toBe(null);
    expect(classifyHttpError("string")).toBe(null);
  });
});

describe("httpErrorCopy", () => {
  it("devuelve copy en español para network error", () => {
    expect(httpErrorCopy({ code: "ERR_NETWORK" })).toBe(
      "No se pudo conectar con el servidor. Verificá tu conexión a internet.",
    );
  });

  it("devuelve copy en español para timeout", () => {
    expect(httpErrorCopy({ code: "ECONNABORTED" })).toBe(
      "El servidor tardó demasiado en responder. Intentá nuevamente en unos segundos.",
    );
  });

  it("devuelve copy en español para 500", () => {
    expect(httpErrorCopy({ response: { status: 500 } })).toBe(
      "Ocurrió un error interno. Intentá nuevamente en unos minutos.",
    );
  });

  it("retorna undefined para errores no clasificables", () => {
    expect(httpErrorCopy(new Error("boom"))).toBeUndefined();
  });
});
