import { useCallback } from "react";

import { useConfirmDialog } from "../useConfirmDialog";
import { toastError, toastSuccess } from "../../lib/toast";
import {
  getArchiveCopy,
  getHardDeleteCopy,
} from "../../components/Modal/copy";

type Identifiable = { id: number };

type UseEntityRowActionsOptions<T> = {
  /** Etiqueta singular ("el inversor", "el lote", "el cliente"). */
  entityLabel: string;
  /** Función para extraer el nombre legible del item (para copy + toast). */
  getLabel: (item: T) => string;
  archive?: (id: number) => Promise<unknown>;
  hardDelete?: (id: number) => Promise<unknown>;
  /** Callback opcional de refresh post-acción. */
  onAfter?: () => void;
};

/**
 * Encapsula los handlers de archive / hard-delete a nivel de fila individual.
 * Centraliza confirm + try/catch + toast + refresh — el mismo bloque de ~25
 * LOC que aparece en cada página con kebab menu.
 *
 * Para multi-select usar `useBulkActions`, que comparte la misma filosofía
 * pero con Promise.allSettled.
 */
export function useEntityRowActions<T extends Identifiable>({
  entityLabel,
  getLabel,
  archive,
  hardDelete,
  onAfter,
}: UseEntityRowActionsOptions<T>) {
  const confirm = useConfirmDialog();

  const handleArchive = useCallback(
    async (item: T) => {
      if (!archive) return;
      const label = getLabel(item);
      const ok = await confirm({
        ...getArchiveCopy(entityLabel, label),
        primaryLabel: getArchiveCopy(entityLabel, label).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "warning",
      });
      if (!ok) return;
      try {
        await archive(item.id);
        toastSuccess(`Se archivó "${label}"`);
        onAfter?.();
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : `No se pudo archivar ${entityLabel}`,
        );
      }
    },
    [archive, confirm, entityLabel, getLabel, onAfter],
  );

  const handleHardDelete = useCallback(
    async (item: T) => {
      if (!hardDelete) return;
      const label = getLabel(item);
      const ok = await confirm({
        ...getHardDeleteCopy(entityLabel, label),
        primaryLabel: getHardDeleteCopy(entityLabel, label).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "danger",
      });
      if (!ok) return;
      try {
        await hardDelete(item.id);
        toastSuccess(`Se eliminó "${label}" definitivamente`);
        onAfter?.();
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : `No se pudo eliminar ${entityLabel}`,
        );
      }
    },
    [confirm, entityLabel, getLabel, hardDelete, onAfter],
  );

  return { handleArchive, handleHardDelete };
}
