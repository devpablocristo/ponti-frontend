import { describe, expect, it } from "vitest";

import type { Actor } from "../../../../hooks/useActors";
import {
  buildActorArchiveRelations,
  getActorArchivedDrawerTitle,
  getActorBulkEntity,
  resolveActorArchiveTarget,
} from "./actorCrudarRouting";

const actor = (id: number, roles: Actor["roles"]): Pick<Actor, "id" | "roles"> => ({
  id,
  roles,
});

describe("actorCrudarRouting", () => {
  it("resuelve actores cliente hacia customer CRUDAR", () => {
    const relations = buildActorArchiveRelations({
      customers: [{ id: 17, actor_id: 1, name: "Agro Lajitas" }],
      managers: [],
      investors: [],
    });

    expect(resolveActorArchiveTarget(actor(1, ["cliente"]), relations)).toEqual({
      kind: "customer",
      id: 17,
    });
  });

  it("resuelve actores responsable hacia manager CRUDAR", () => {
    const relations = buildActorArchiveRelations({
      customers: [],
      managers: [{ id: 23, actor_id: 2, name: "Nico" }],
      investors: [],
    });

    expect(resolveActorArchiveTarget(actor(2, ["responsable"]), relations)).toEqual({
      kind: "manager",
      id: 23,
    });
  });

  it("resuelve actores inversor hacia investor CRUDAR", () => {
    const relations = buildActorArchiveRelations({
      customers: [],
      managers: [],
      investors: [{ id: 31, actor_id: 3, name: "Soalen SRL" }],
    });

    expect(resolveActorArchiveTarget(actor(3, ["inversor"]), relations)).toEqual({
      kind: "investor",
      id: 31,
    });
  });

  it("mantiene endpoint actor para roles sin CRUDAR dedicado", () => {
    const relations = buildActorArchiveRelations({
      customers: [],
      managers: [],
      investors: [],
    });

    expect(resolveActorArchiveTarget(actor(4, ["proveedor"]), relations)).toEqual({
      kind: "actor",
      id: 4,
    });
  });

  it("usa precedencia deterministica para actores multirrol", () => {
    const relations = buildActorArchiveRelations({
      customers: [{ id: 17, actor_id: 5, name: "Agro Lajitas" }],
      managers: [{ id: 23, actor_id: 5, name: "Nico" }],
      investors: [{ id: 31, actor_id: 5, name: "Soalen SRL" }],
    });

    expect(
      resolveActorArchiveTarget(actor(5, ["inversor", "responsable", "cliente"]), relations)
    ).toEqual({ kind: "customer", id: 17 });
  });

  it("usa copy de bulk y titulo de archivados segun el rol especifico", () => {
    expect(getActorBulkEntity("cliente").plural).toBe("clientes");
    expect(getActorBulkEntity("responsable").plural).toBe("responsables");
    expect(getActorBulkEntity("inversor").plural).toBe("inversores");
    expect(getActorBulkEntity("").plural).toBe("actores");

    expect(getActorArchivedDrawerTitle("cliente")).toBe("Clientes archivados");
    expect(getActorArchivedDrawerTitle("responsable")).toBe("Responsables archivados");
    expect(getActorArchivedDrawerTitle("inversor")).toBe("Inversores archivados");
    expect(getActorArchivedDrawerTitle("")).toBe("Actores archivados");
  });
});
