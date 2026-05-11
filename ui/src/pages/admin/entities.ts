import type { EntityCopy } from "../../components/Modal/copy";

/**
 * Copy léxico de cada entidad CRUDAR. Se importa desde las páginas de
 * lista activa y archivada (mismo entity en ambos lados) y se pasa a las
 * primitivas (useEntityRowActions / useBulkActions / makeSelectColumn /
 * BulkSelectionPanel / ArchivedListPage).
 */

export const CUSTOMER_ENTITY: EntityCopy = {
  article: "el",
  singular: "cliente",
  plural: "clientes",
};

export const ACTOR_ENTITY: EntityCopy = {
  article: "el",
  singular: "actor",
  plural: "actores",
};

export const PROJECT_ENTITY: EntityCopy = {
  article: "el",
  singular: "proyecto",
  plural: "proyectos",
};

export const INVESTOR_ENTITY: EntityCopy = {
  article: "el",
  singular: "inversor",
  plural: "inversores",
};

export const MANAGER_ENTITY: EntityCopy = {
  article: "el",
  singular: "responsable",
  plural: "responsables",
};

export const CAMPAIGN_ENTITY: EntityCopy = {
  article: "la",
  singular: "campaña",
  plural: "campañas",
};

export const FIELD_ENTITY: EntityCopy = {
  article: "el",
  singular: "campo",
  plural: "campos",
};

export const LOT_ENTITY: EntityCopy = {
  article: "el",
  singular: "lote",
  plural: "lotes",
};

export const SUPPLY_ENTITY: EntityCopy = {
  article: "el",
  singular: "insumo",
  plural: "insumos",
};

export const LABOR_ENTITY: EntityCopy = {
  article: "la",
  singular: "labor",
  plural: "labores",
};

export const WORKORDER_ENTITY: EntityCopy = {
  article: "la",
  singular: "orden",
  plural: "órdenes",
};
