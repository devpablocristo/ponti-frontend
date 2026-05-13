import { describe, expect, it } from "vitest";

import {
  findEntityMatches,
  normalizeEntityName,
  normalizeEntityRootName,
} from "./entityNameMatcher";

const customers = [
  { id: 1, name: "Agro Tuc" },
  { id: 2, name: "La Esperanza" },
  { id: 3, name: "Campo Azul S.R.L." },
];

describe("entityNameMatcher", () => {
  it("normalizes casing, accents and spacing", () => {
    expect(normalizeEntityName("  ÁGRO   Túc  ")).toBe(normalizeEntityName("Agro Tuc"));
  });

  it("normalizes legal suffix punctuation", () => {
    expect(normalizeEntityName("Campo Azul S.R.L.")).toBe(
      normalizeEntityName("campo azul srl")
    );
  });

  it("normalizes legal suffixes for root similarity without collapsing the display name", () => {
    expect(normalizeEntityRootName("Agro Tuc S.R.L.")).toBe(
      normalizeEntityRootName("Agro Tuc")
    );
    expect(normalizeEntityName("Agro Tuc S.R.L.")).not.toBe(normalizeEntityName("Agro Tuc"));
  });

  it("blocks exact normalized duplicates", () => {
    const result = findEntityMatches("AGRO TUC", customers);

    expect(result.exactMatch?.id).toBe(1);
    expect(result.canCreate).toBe(false);
    expect(result.requiresConfirmation).toBe(false);
  });

  it("requires confirmation for strong similar matches", () => {
    const result = findEntityMatches("Agro Tuc SRL", customers);

    expect(result.exactMatch).toBeNull();
    expect(result.similarMatches.map((item) => item.id)).toContain(1);
    expect(result.canCreate).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
  });

  it("allows creation when there are no relevant matches", () => {
    const result = findEntityMatches("Las Palmas", customers);

    expect(result.exactMatch).toBeNull();
    expect(result.similarMatches).toHaveLength(0);
    expect(result.canCreate).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });
});
