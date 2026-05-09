import { useCallback, useMemo } from "react";
import { Archive, Trash2, type LucideIcon } from "lucide-react";

import { useBulkSelection } from "../useBulkSelection";
import { useConfirmDialog } from "../useConfirmDialog";
import { toastError, toastSuccess } from "../../lib/toast";
import {
  getBulkArchiveCopy,
  getBulkHardDeleteCopy,
} from "../../components/Modal/copy";

type Identifiable = { id: number };

type BulkAction = {
  label: string;
  icon: LucideIcon;
  variant?: "danger";
  onClick: () => void;
};

type UseBulkActionsOptions<T> = {
  items: T[];
  entityLabelPlural: string;
  archive?: (id: number) => Promise<unknown>;
  hardDelete?: (id: number) => Promise<unknown>;
  /** Se llama luego de cualquier operación bulk (refrescar lista, etc). */
  onAfter?: () => void;
};

/**
 * Encapsula el patrón de bulk archive + hard-delete que aparece en cada lista
 * activa: confirmación, Promise.allSettled, toast con resultado parcial, clear
 * de la selección, callback de refresh.
 *
 * Devuelve los handlers y un array `actions` listo para `<BulkActionBar>`.
 */
export function useBulkActions<T extends Identifiable>({
  items,
  entityLabelPlural,
  archive,
  hardDelete,
  onAfter,
}: UseBulkActionsOptions<T>) {
  const selection = useBulkSelection<T>(items);
  const { selectedItems, selectedCount, clear } = selection;
  const confirm = useConfirmDialog();

  const runBulk = useCallback(
    async (
      op: (id: number) => Promise<unknown>,
      copy: { title: string; message: string; primaryButtonText: string; secondaryButtonText: string },
      severity: "warning" | "danger",
      successMsg: (count: number) => string,
      partialMsg: (ok: number, failed: number, total: number) => string,
    ) => {
      if (selectedItems.length === 0) return;
      const ok = await confirm({ ...copy, severity });
      if (!ok) return;
      const results = await Promise.allSettled(selectedItems.map((it) => op(it.id)));
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - okCount;
      if (failed === 0) toastSuccess(successMsg(okCount));
      else toastError(partialMsg(okCount, failed, results.length));
      clear();
      onAfter?.();
    },
    [clear, confirm, onAfter, selectedItems],
  );

  const handleBulkArchive = useCallback(async () => {
    if (!archive) return;
    await runBulk(
      archive,
      getBulkArchiveCopy(selectedCount, entityLabelPlural),
      "warning",
      (count) => `Se archivaron ${count} ${entityLabelPlural}.`,
      (okN, failed, total) => `${okN} de ${total} OK; ${failed} fallaron.`,
    );
  }, [archive, entityLabelPlural, runBulk, selectedCount]);

  const handleBulkHardDelete = useCallback(async () => {
    if (!hardDelete) return;
    await runBulk(
      hardDelete,
      getBulkHardDeleteCopy(selectedCount, entityLabelPlural),
      "danger",
      (count) => `Se eliminaron ${count} ${entityLabelPlural}.`,
      (okN, failed, total) =>
        `${okN} de ${total} OK; ${failed} fallaron (probablemente por dependencias).`,
    );
  }, [entityLabelPlural, hardDelete, runBulk, selectedCount]);

  const actions = useMemo<BulkAction[]>(() => {
    const out: BulkAction[] = [];
    if (archive) {
      out.push({
        label: `Archivar ${selectedCount}`,
        icon: Archive,
        onClick: handleBulkArchive,
      });
    }
    if (hardDelete) {
      out.push({
        label: `Eliminar ${selectedCount}`,
        icon: Trash2,
        variant: "danger",
        onClick: handleBulkHardDelete,
      });
    }
    return out;
  }, [archive, handleBulkArchive, handleBulkHardDelete, hardDelete, selectedCount]);

  return {
    ...selection,
    handleBulkArchive,
    handleBulkHardDelete,
    actions,
  };
}
