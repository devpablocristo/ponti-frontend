import { describe, expect, it } from "vitest";

import { filterActive } from "./filterActive";

describe("filterActive", () => {
  it("devuelve solo items con archived_at null y deleted_at null", () => {
    const items = [
      { id: 1, name: "Activo" },
      { id: 2, name: "Archivado por archived_at", archived_at: "2026-01-01T00:00:00Z" },
      { id: 3, name: "Archivado por deleted_at", deleted_at: "2026-02-01T00:00:00Z" },
      { id: 4, name: "Activo explícito", archived_at: null, deleted_at: null },
    ];
    expect(filterActive(items).map((i) => i.id)).toEqual([1, 4]);
  });

  it("acepta null/undefined sin romper", () => {
    expect(filterActive(null)).toEqual([]);
    expect(filterActive(undefined)).toEqual([]);
  });

  it("preserva tipo del elemento (genérico)", () => {
    type Field = { id: number; name: string; archived_at?: string | null };
    const fields: Field[] = [
      { id: 1, name: "Campo A" },
      { id: 2, name: "Campo B", archived_at: "2026-01-01T00:00:00Z" },
    ];
    const out = filterActive(fields);
    // El tipo se preserva — accedemos a `name` sin cast.
    expect(out[0].name).toBe("Campo A");
    expect(out.length).toBe(1);
  });

  it("considera activos items sin campos de lifecycle (default)", () => {
    const items = [{ id: 1, name: "Sin metadata" }];
    expect(filterActive(items).length).toBe(1);
  });
});
