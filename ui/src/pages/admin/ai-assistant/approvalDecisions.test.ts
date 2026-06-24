import { describe, expect, it } from "vitest";
import { HttpError } from "@devpablocristo/core-http/fetch";

import {
  currentUserSubject,
  decisionErrorInfo,
  FORBIDDEN_MESSAGE,
  GENERIC_DECISION_ERROR,
  isRequestedBySubject,
  SOD_CONFLICT_MESSAGE,
} from "./approvalDecisions";

describe("decisionErrorInfo", () => {
  it("409 sin mensaje útil cae al mensaje de segregación de funciones", () => {
    const info = decisionErrorInfo(new HttpError("Error en la solicitud", 409));
    expect(info.message).toBe(SOD_CONFLICT_MESSAGE);
    expect(info.refresh).toBe(false);
  });

  it("409 con mensaje de Nexus propaga ese mensaje", () => {
    const info = decisionErrorInfo(
      new HttpError("requester cannot approve their own request", 409)
    );
    expect(info.message).toBe("requester cannot approve their own request");
    expect(info.refresh).toBe(false);
  });

  it("403 mapea al mensaje de rol sin permiso", () => {
    const info = decisionErrorInfo(new HttpError("forbidden", 403));
    expect(info.message).toBe(FORBIDDEN_MESSAGE);
    expect(info.refresh).toBe(false);
  });

  it("410 pide refrescar el inbox (request expirada)", () => {
    const info = decisionErrorInfo(new HttpError("gone", 410));
    expect(info.refresh).toBe(true);
    expect(info.message).toContain("expiró");
  });

  it("404 pide refrescar (request resuelta o inexistente en Nexus)", () => {
    const info = decisionErrorInfo(new HttpError("Error en la solicitud", 404));
    expect(info.refresh).toBe(true);
  });

  it("errores no-HTTP devuelven su mensaje o el genérico", () => {
    expect(decisionErrorInfo(new Error("boom")).message).toBe("boom");
    expect(decisionErrorInfo("???").message).toBe(GENERIC_DECISION_ERROR);
  });
});

describe("identidad del solicitante (SoD proactivo)", () => {
  it("matchea requested_by con formato user:<sub>", () => {
    expect(isRequestedBySubject("user:abc-123", "abc-123")).toBe(true);
    expect(isRequestedBySubject("abc-123", "abc-123")).toBe(true);
    expect(isRequestedBySubject("user:otro", "abc-123")).toBe(false);
    expect(isRequestedBySubject(undefined, "abc-123")).toBe(false);
    expect(isRequestedBySubject("user:abc-123", null)).toBe(false);
  });

  it("currentUserSubject usa sub y cae al ID numérico (mismo orden que el BFF)", () => {
    expect(currentUserSubject({ sub: "abc-123", exp: 0 })).toBe("abc-123");
    expect(currentUserSubject({ ID: 7, exp: 0 })).toBe("7");
    expect(currentUserSubject({ exp: 0 })).toBeNull();
    expect(currentUserSubject(null)).toBeNull();
  });
});
