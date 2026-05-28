import type { EntityCopy } from "../../../../components/Modal/copy";
import type { CustomerData } from "../../../../hooks/useCustomers/types";
import type { Investor } from "../../../../hooks/useInvestors";
import type { Manager } from "../../../../hooks/useManagers";
import type { Actor, ActorRole } from "../../../../hooks/useActors";
import { ACTOR_ENTITY, CUSTOMER_ENTITY, INVESTOR_ENTITY, MANAGER_ENTITY } from "../../entities";

export type ActorArchiveTarget =
  | { kind: "customer"; id: number }
  | { kind: "manager"; id: number }
  | { kind: "investor"; id: number }
  | { kind: "actor"; id: number };

export type ActorArchiveRelations = {
  customerByActorId: Map<number, number>;
  managerByActorId: Map<number, number>;
  investorByActorId: Map<number, number>;
};

type RelationRecord = {
  id: number;
  actor_id?: number | null;
};

export const CRUDAR_ROLE_ORDER: ActorRole[] = ["cliente", "responsable", "inversor"];

export function buildEntityIdByActorId<T extends RelationRecord>(
  records: T[]
): Map<number, number> {
  const out = new Map<number, number>();
  for (const record of records) {
    if (typeof record.actor_id === "number") {
      out.set(record.actor_id, record.id);
    }
  }
  return out;
}

export function buildActorArchiveRelations(params: {
  customers: CustomerData[];
  managers: Manager[];
  investors: Investor[];
}): ActorArchiveRelations {
  return {
    customerByActorId: buildEntityIdByActorId(params.customers),
    managerByActorId: buildEntityIdByActorId(params.managers),
    investorByActorId: buildEntityIdByActorId(params.investors),
  };
}

export function resolveActorArchiveTarget(
  actor: Pick<Actor, "id" | "roles">,
  relations: ActorArchiveRelations
): ActorArchiveTarget {
  const roles = actor.roles ?? [];
  for (const role of CRUDAR_ROLE_ORDER) {
    if (!roles.includes(role)) continue;

    if (role === "cliente") {
      const id = relations.customerByActorId.get(actor.id);
      if (typeof id === "number") return { kind: "customer", id };
    }
    if (role === "responsable") {
      const id = relations.managerByActorId.get(actor.id);
      if (typeof id === "number") return { kind: "manager", id };
    }
    if (role === "inversor") {
      const id = relations.investorByActorId.get(actor.id);
      if (typeof id === "number") return { kind: "investor", id };
    }
  }

  return { kind: "actor", id: actor.id };
}

export function getActorBulkEntity(role: ActorRole | ""): EntityCopy {
  switch (role) {
    case "cliente":
      return CUSTOMER_ENTITY;
    case "responsable":
      return MANAGER_ENTITY;
    case "inversor":
      return INVESTOR_ENTITY;
    default:
      return ACTOR_ENTITY;
  }
}

export function getActorArchivedDrawerTitle(role: ActorRole | ""): string {
  switch (role) {
    case "cliente":
      return "Clientes archivados";
    case "responsable":
      return "Responsables archivados";
    case "inversor":
      return "Inversores archivados";
    default:
      return "Actores archivados";
  }
}
