// Compat shim. La definición canónica vive en `@/copy`. Este archivo se
// mantiene mientras los callers existentes (`useBulkActions`,
// `useEntityRowActions`, `ArchivedListPage`, etc.) sigan importando desde
// acá. Cuando todos migren, este archivo se puede borrar.

import {
  confirmBulkArchive,
  confirmBulkHardDelete,
  confirmBulkRestore,
  successCreate,
  successUpdate,
  type ConfirmCopy as CatalogConfirmCopy,
  type Entity,
} from "@/copy";

export type ConfirmCopy = CatalogConfirmCopy;

/**
 * Alias para el `Entity` del catálogo. Históricamente este shape se llamaba
 * `EntityCopy` en el código antiguo; lo mantenemos como alias para que las
 * páginas existentes sigan compilando sin tener que tocarlas en esta fase.
 */
export type EntityCopy = Entity;

// ─── Confirmaciones (firma legacy: count + plural string) ────────────────────

/**
 * Firma legacy de los helpers de bulk: reciben count y el plural del label
 * (string suelto). Adentro construimos una Entity sintética para reutilizar
 * el copy canónico. Cuando migremos los callers a `(entity, count)` esto
 * desaparece.
 */
function syntheticEntity(label: string): Entity {
  return { article: "el", singular: label, plural: label };
}

export const getBulkArchiveCopy = (count: number, entityLabelPlural: string): ConfirmCopy =>
  confirmBulkArchive(syntheticEntity(entityLabelPlural), count);

export const getBulkRestoreCopy = (count: number, entityLabelPlural: string): ConfirmCopy =>
  confirmBulkRestore(syntheticEntity(entityLabelPlural), count);

export const getBulkHardDeleteCopy = (count: number, entityLabelPlural: string): ConfirmCopy =>
  confirmBulkHardDelete(syntheticEntity(entityLabelPlural), count);

// ─── Mensajes post-acción ─────────────────────────────────────────────────────

export const getCreateSuccessCopy = (entityLabel: string): string =>
  successCreate({ article: "el", singular: entityLabel, plural: entityLabel });

export const getUpdateSuccessCopy = (entityLabel: string): string =>
  successUpdate({ article: "el", singular: entityLabel, plural: entityLabel });
