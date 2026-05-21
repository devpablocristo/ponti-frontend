import { useCallback, useMemo } from "react";
import { Archive, Pencil, type LucideIcon } from "lucide-react";

import { useBulkSelection } from "../useBulkSelection";
import { useConfirmDialog } from "../useConfirmDialog";
import { notify } from "../../lib/notify";
import {
  type EntityCopy,
  getBulkArchiveCopy,
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
  /** Copy léxico de la entidad — se deriva el plural para confirm/toast/labels. */
  entity: EntityCopy;
  archive?: (id: number) => Promise<unknown>;
  onEdit?: (item: T) => void;
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
  entity,
  archive,
  onEdit,
  onAfter,
}: UseBulkActionsOptions<T>) {
  const selection = useBulkSelection<T>(items);
  const { selectedItems, selectedCount, clear } = selection;
  const confirm = useConfirmDialog();
  const entityLabelPlural = entity.plural;

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
      if (failed === 0) notify.success(successMsg(okCount));
      else notify.error(partialMsg(okCount, failed, results.length));
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

  const actions = useMemo<BulkAction[]>(() => {
    const out: BulkAction[] = [];
    if (onEdit && selectedCount === 1 && selectedItems[0]) {
      out.push({
        label: "Editar",
        icon: Pencil,
        onClick: () => onEdit(selectedItems[0]),
      });
    }
    if (archive) {
      out.push({
        label: `Archivar ${selectedCount}`,
        icon: Archive,
        onClick: handleBulkArchive,
      });
    }
    return out;
  }, [
    archive,
    handleBulkArchive,
    onEdit,
    selectedCount,
    selectedItems,
  ]);

  return {
    ...selection,
    handleBulkArchive,
    actions,
  };
}
