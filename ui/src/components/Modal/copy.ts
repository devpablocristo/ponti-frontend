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

/** Devuelve "el inversor", "la campaña", etc. (uso con confirm copy). */
export const articleSingular = (entity: EntityCopy): string =>
  `${entity.article} ${entity.singular}`;

// ─── Confirmaciones de acción ────────────────────────────────────────────────

export const getArchiveCopy = (entityLabel: string, itemLabel: string): ConfirmCopy => ({
  title: "Confirmar archivado",
  message: `¿Archivar ${entityLabel} "${itemLabel}"? Podés restaurarlo más tarde desde la vista de archivados.`,
  primaryButtonText: "Archivar",
  secondaryButtonText: "Cancelar",
});

export const getRestoreCopy = (entityLabel: string, itemLabel: string): ConfirmCopy => ({
  title: "Confirmar restauración",
  message: `¿Restaurar ${entityLabel} "${itemLabel}"?`,
  primaryButtonText: "Restaurar",
  secondaryButtonText: "Cancelar",
});

export const getHardDeleteCopy = (entityLabel: string, itemLabel: string): ConfirmCopy => ({
  title: "Confirmar eliminación definitiva",
  message: `¿Eliminar definitivamente ${entityLabel} "${itemLabel}"? Esta acción no se puede deshacer. Si tiene datos relacionados, deberás archivar o eliminar esos primero.`,
  primaryButtonText: "Eliminar",
  secondaryButtonText: "Cancelar",
});

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
  primaryButtonText: "Eliminar",
  secondaryButtonText: "Cancelar",
});

// ─── Mensajes post-acción (toast / banner) ──────────────────────────────────

export const getCreateSuccessCopy = (entityLabel: string): string =>
  `Se creó ${entityLabel} correctamente.`;

export const getUpdateSuccessCopy = (entityLabel: string): string =>
  `Se actualizó ${entityLabel}.`;

export const getArchiveSuccessCopy = (itemLabel: string): string =>
  `Se archivó "${itemLabel}".`;

export const getRestoreSuccessCopy = (itemLabel: string): string =>
  `Se restauró "${itemLabel}".`;

export const getHardDeleteSuccessCopy = (itemLabel: string): string =>
  `Se eliminó "${itemLabel}" definitivamente.`;

export const getBulkSuccessCopy = (
  successful: number,
  total: number,
  action: string,
): string =>
  successful === total
    ? `Se ${action} ${successful} de ${total} correctamente.`
    : `Se ${action} ${successful} de ${total}. ${total - successful} fallaron — revisá los errores.`;

// ─── Mensajes de error ──────────────────────────────────────────────────────

export type DependencyDetail = {
  type: string; // ej: "proyectos"
  count: number;
  status?: "active" | "archived";
};

export const getDependencyErrorCopy = (
  entityLabel: string,
  itemLabel: string,
  dependents: DependencyDetail[],
): string => {
  if (dependents.length === 0) {
    return `No se puede eliminar ${entityLabel} "${itemLabel}". Tiene datos relacionados.`;
  }
  const parts = dependents.map((d) => {
    const status = d.status === "active" ? "activos" : d.status === "archived" ? "archivados" : "";
    return status ? `${d.count} ${d.type} ${status}` : `${d.count} ${d.type}`;
  });
  const summary =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
      ? `${parts[0]} y ${parts[1]}`
      : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  return `No se puede eliminar ${entityLabel} "${itemLabel}". Tiene ${summary}. Archivá o eliminá esos primero.`;
};
