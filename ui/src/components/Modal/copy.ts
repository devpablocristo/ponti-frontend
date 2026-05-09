// Copy estandarizado para confirmaciones de archive / restore / hard-delete.
// Cada CRUD del proyecto debe usar estas funciones para que los modales sean
// idénticos en tono, terminología y formato.

export type ConfirmCopy = {
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText: string;
};

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
