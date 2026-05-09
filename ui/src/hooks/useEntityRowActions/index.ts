import { useCallback } from "react";

import { useConfirmDialog } from "../useConfirmDialog";
import { toastError, toastSuccess } from "../../lib/toast";
import {
  articleSingular,
  type EntityCopy,
  getArchiveCopy,
  getHardDeleteCopy,
} from "../../components/Modal/copy";

type Identifiable = { id: number };

type UseEntityRowActionsOptions<T> = {
  /** Copy léxico de la entidad — se deriva el article+singular para los modales. */
  entity: EntityCopy;
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
  entity,
  getLabel,
  archive,
  hardDelete,
  onAfter,
}: UseEntityRowActionsOptions<T>) {
  const confirm = useConfirmDialog();
  const entityLabel = articleSingular(entity);

  const runRowAction = useCallback(
    async (
      item: T,
      op: (id: number) => Promise<unknown>,
      copy: { title: string; message: string; primaryButtonText: string; secondaryButtonText: string },
      severity: "warning" | "danger",
      successMsg: (label: string) => string,
      fallbackError: string,
    ) => {
      const label = getLabel(item);
      const ok = await confirm({ ...copy, severity });
      if (!ok) return;
      try {
        await op(item.id);
        toastSuccess(successMsg(label));
        onAfter?.();
      } catch (err) {
        toastError(err instanceof Error ? err.message : fallbackError);
      }
    },
    [confirm, getLabel, onAfter],
  );

  const handleArchive = useCallback(
    async (item: T) => {
      if (!archive) return;
      await runRowAction(
        item,
        archive,
        getArchiveCopy(entityLabel, getLabel(item)),
        "warning",
        (label) => `Se archivó "${label}"`,
        `No se pudo archivar ${entityLabel}`,
      );
    },
    [archive, entityLabel, getLabel, runRowAction],
  );

  const handleHardDelete = useCallback(
    async (item: T) => {
      if (!hardDelete) return;
      await runRowAction(
        item,
        hardDelete,
        getHardDeleteCopy(entityLabel, getLabel(item)),
        "danger",
        (label) => `Se eliminó "${label}" definitivamente`,
        `No se pudo eliminar ${entityLabel}`,
      );
    },
    [entityLabel, getLabel, hardDelete, runRowAction],
  );

  return { handleArchive, handleHardDelete };
}
