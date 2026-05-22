import { describe, expect, it } from "vitest";
import { formatError } from "./formatError";

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
});
