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
  const confirm = useConfirmDialog();

  const runBulk = useCallback(
    async (
      op: (id: number) => Promise<unknown>,
      successMsg: (count: number) => string,
      partialMsg: (ok: number, failed: number, total: number) => string,
    ) => {
      const selected = selection.selectedItems;
      if (selected.length === 0) return;
      const results = await Promise.allSettled(selected.map((it) => op(it.id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (failed === 0) toastSuccess(successMsg(ok));
      else toastError(partialMsg(ok, failed, results.length));
      selection.clear();
      onAfter?.();
    },
    [onAfter, selection],
  );

  const handleBulkArchive = useCallback(async () => {
    if (!archive || selection.selectedCount === 0) return;
    const ok = await confirm({
      ...getBulkArchiveCopy(selection.selectedCount, entityLabelPlural),
      severity: "warning",
    });
    if (!ok) return;
    await runBulk(
      archive,
      (count) => `Se archivaron ${count} ${entityLabelPlural}.`,
      (okN, failed, total) =>
        `${okN} de ${total} OK; ${failed} fallaron.`,
    );
  }, [archive, confirm, entityLabelPlural, runBulk, selection.selectedCount]);

  const handleBulkHardDelete = useCallback(async () => {
    if (!hardDelete || selection.selectedCount === 0) return;
    const ok = await confirm({
      ...getBulkHardDeleteCopy(selection.selectedCount, entityLabelPlural),
      severity: "danger",
    });
    if (!ok) return;
    await runBulk(
      hardDelete,
      (count) => `Se eliminaron ${count} ${entityLabelPlural}.`,
      (okN, failed, total) =>
        `${okN} de ${total} OK; ${failed} fallaron (probablemente por dependencias).`,
    );
  }, [confirm, entityLabelPlural, hardDelete, runBulk, selection.selectedCount]);

  const actions = useMemo<BulkAction[]>(() => {
    const out: BulkAction[] = [];
    if (archive) {
      out.push({
        label: `Archivar ${selection.selectedCount}`,
        icon: Archive,
        onClick: handleBulkArchive,
      });
    }
    if (hardDelete) {
      out.push({
        label: `Eliminar ${selection.selectedCount}`,
        icon: Trash2,
        variant: "danger",
        onClick: handleBulkHardDelete,
      });
    }
    return out;
  }, [archive, handleBulkArchive, handleBulkHardDelete, hardDelete, selection.selectedCount]);

  return {
    ...selection,
    handleBulkArchive,
    handleBulkHardDelete,
    actions,
  };
}
