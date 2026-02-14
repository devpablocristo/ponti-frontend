import { describe, expect, it } from "vitest";

import {
  mapProjectFieldsPayload,
  normalizeNullableDecimal,
} from "./projectPayload";
import type { Field } from "./Fields";

describe("normalizeNullableDecimal", () => {
  it("normaliza vacío, espacios, null y undefined a null", () => {
    expect(normalizeNullableDecimal("").value).toBeNull();
    expect(normalizeNullableDecimal("   ").value).toBeNull();
    expect(normalizeNullableDecimal(null).value).toBeNull();
    expect(normalizeNullableDecimal(undefined).value).toBeNull();
  });

  it("acepta number", () => {
    expect(normalizeNullableDecimal(10.5)).toEqual({ value: 10.5 });
  });

  it("convierte numeric-string a number", () => {
    expect(normalizeNullableDecimal("10.5")).toEqual({ value: 10.5 });
  });

  it("rechaza invalid-string", () => {
    const result = normalizeNullableDecimal("abc");
    expect(result.value).toBeNull();
    expect(result.error).toBeDefined();
  });
});

describe("mapProjectFieldsPayload", () => {
  const baseField: Field = {
    id: 1,
    name: "Campo 1",
    leaseType: "4",
    leaseTypePercent: 20,
    leaseTypeValue: 120,
    investors: [{ id: 1, name: "Inv", percentage: 20 }],
    plots: [
      {
        id: 1,
        name: "Lote 1",
        hectares: 10,
        previousCrop: { id: 1, name: "Soja" },
        currentCrop: { id: 2, name: "Maiz" },
        season: "2025-2026",
      },
    ],
  };

  it("garantiza investors y lots presentes aunque falten en origen", () => {
    const malformedField = {
      ...baseField,
      investors: undefined,
      plots: undefined,
    } as unknown as Field;

    const result = mapProjectFieldsPayload([malformedField], false);

    expect(result.errors).toEqual([]);
    expect(result.fields[0].investors).toEqual([]);
    expect(result.fields[0].lots).toEqual([]);
  });

  it("devuelve error cuando lease_type_* no es numérico", () => {
    const invalidField = {
      ...baseField,
      leaseTypePercent: "abc",
    } as unknown as Field;

    const result = mapProjectFieldsPayload([invalidField], true);

    expect(result.errors).toContain("fields[0].lease_type_percent Debe ser numérico.");
  });
});
