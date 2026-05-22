// Compat shim. Las definiciones canónicas viven en `@/copy/entities.ts`.
// Las páginas existentes importan estas constantes; cuando migren a
// `ENTITIES_BY_KEY` directamente, este archivo se puede borrar.

import { ENTITIES_BY_KEY } from "@/copy";
import type { EntityCopy } from "../../components/Modal/copy";

export const CUSTOMER_ENTITY: EntityCopy = ENTITIES_BY_KEY.customer;
export const ACTOR_ENTITY: EntityCopy = ENTITIES_BY_KEY.actor;
export const PROJECT_ENTITY: EntityCopy = ENTITIES_BY_KEY.project;
export const INVESTOR_ENTITY: EntityCopy = ENTITIES_BY_KEY.investor;
export const MANAGER_ENTITY: EntityCopy = ENTITIES_BY_KEY.manager;
export const CAMPAIGN_ENTITY: EntityCopy = ENTITIES_BY_KEY.campaign;
export const FIELD_ENTITY: EntityCopy = ENTITIES_BY_KEY.field;
export const LOT_ENTITY: EntityCopy = ENTITIES_BY_KEY.lot;
export const SUPPLY_ENTITY: EntityCopy = ENTITIES_BY_KEY.supply;
export const LABOR_ENTITY: EntityCopy = ENTITIES_BY_KEY.labor;
// El catálogo canónico tiene singular="orden de trabajo"; en código legacy
// las pantallas mostraban "orden" / "órdenes" sin "de trabajo". Mantenemos
// la forma corta acá para no cambiar UX existente; el catálogo nuevo se
// usa donde aparezca el contexto completo (errores, traducciones, etc.).
export const WORKORDER_ENTITY: EntityCopy = {
  article: "la",
  singular: "orden",
  plural: "órdenes",
};
