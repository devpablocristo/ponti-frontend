// Copy estandarizado para confirmaciones y mensajes del sistema CRUDAR.
// Cada CRUD del proyecto debe usar estas funciones para que los modales y
// mensajes sean idénticos en tono, terminología y formato.

export type ConfirmCopy = {
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText: string;
};

/**
 * Tres formas léxicas de la entidad usadas a lo largo del sistema CRUDAR:
 *   - article + singular ("el inversor") para confirm copy.
 *   - singular ("inversor") para aria-label de checkboxes de selección.
 *   - plural ("inversores") para bulk copy y resumen de selección.
 *
 * Cada página declara una sola constante EntityCopy y la pasa a las
 * primitivas (useEntityRowActions, useBulkActions, makeSelectColumn,
 * BulkSelectionPanel, ArchivedListPage), que derivan internamente la
 * forma que necesitan.
 */
export type EntityCopy = {
  article: string;
  singular: string;
  plural: string;
};

// ─── Confirmaciones de acción ────────────────────────────────────────────────

export const getBulkArchiveCopy = (count: number, entityLabelPlural: string): ConfirmCopy => ({
  title: "Confirmar archivado",
  message: `¿Archivar ${count} ${entityLabelPlural}? Podés restaurarlos más tarde desde la vista de archivados.`,
  primaryButtonText: "Archivar",
  secondaryButtonText: "Cancelar",
});

export const getBulkRestoreCopy = (count: number, entityLabelPlural: string): ConfirmCopy => ({
  title: "Confirmar restauración",
  message: `¿Restaurar ${count} ${entityLabelPlural}?`,
  primaryButtonText: "Restaurar",
  secondaryButtonText: "Cancelar",
});

export const getBulkHardDeleteCopy = (count: number, entityLabelPlural: string): ConfirmCopy => ({
  title: "Confirmar eliminación definitiva",
  message: `¿Eliminar definitivamente ${count} ${entityLabelPlural}? Esta acción no se puede deshacer. Los items que tengan datos relacionados no se podrán eliminar.`,
  primaryButtonText: "Eliminar definitivamente",
  secondaryButtonText: "Cancelar",
});

// ─── Mensajes post-acción (toast / banner) ──────────────────────────────────

export const getCreateSuccessCopy = (entityLabel: string): string =>
  `Se creó ${entityLabel} correctamente.`;

export const getUpdateSuccessCopy = (entityLabel: string): string =>
  `Se actualizó ${entityLabel}.`;
