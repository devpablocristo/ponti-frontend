import { useCallback, useState } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useLots from "../../../../hooks/useLots";
import type { LotsData } from "../../../../hooks/useLots/types";
import { Column } from "../../types";
import { LOT_ENTITY as ENTITY } from "../../entities";
import ArchivedWorkOrders from "../work-orders/ArchivedWorkOrders";

const SEASON_NAMES: Record<string, string> = {
  "1": "Otoño",
  "2": "Invierno",
  "3": "Primavera",
  "4": "Verano",
};

const columns: Column<LotsData>[] = [
  { key: "project_name", header: "Proyecto" },
  { key: "field_name", header: "Campo" },
  { key: "lot_name", header: "Lote" },
  {
    key: "season",
    header: "Periodo",
    render: (value) => {
      const raw = String(value ?? "");
      return SEASON_NAMES[raw] ?? raw;
    },
  },
  { key: "current_crop", header: "Cultivo actual" },
];

type ArchivedLotsProps = {
  onAfterRestore?: () => void;
};

// Detecta el conflict 409 del BE "El lote tiene N orden(es) de trabajo asociada(s)".
// El BE devuelve el 409 con prefijo `BLOCKED_BY_WORKORDERS:<count>|...`
// (ver `internal/lot/repository.go` HardDeleteLot). Parseamos por código,
// no por el texto del mensaje, para que sea robusto a cambios de copy.
const extractBlockedByWorkOrders = (
  message: string,
): { count: number } | null => {
  const match = message.match(/BLOCKED_BY_WORKORDERS:(\d+)/);
  if (!match) return null;
  const count = Number(match[1] ?? 0);
  return count > 0 ? { count } : null;
};

export default function ArchivedLots({ onAfterRestore }: ArchivedLotsProps = {}) {
  const {
    lots,
    getArchivedLots,
    archiveLot: _archiveLot,
    restoreLot,
    hardDeleteLot,
    processing,
    error,
  } = useLots();

  const [blockedLot, setBlockedLot] = useState<{
    lotId: number;
    lotName: string;
    count: number;
  } | null>(null);
  const [woDrawerLotId, setWoDrawerLotId] = useState<number | null>(null);

  const refetch = useCallback(
    () => getArchivedLots("page=1&per_page=1000"),
    [getArchivedLots],
  );

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreLot(id);
      onAfterRestore?.();
    },
    [restoreLot, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      const lot = lots.find((l) => l.id === id);
      try {
        await hardDeleteLot(id);
        onAfterRestore?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        const blocked = extractBlockedByWorkOrders(message);
        if (blocked && lot) {
          setBlockedLot({ lotId: id, lotName: lot.lot_name, count: blocked.count });
          // Suppress generic error toast: we'll show the guided modal instead.
          return;
        }
        throw err;
      }
    },
    [hardDeleteLot, onAfterRestore, lots],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<LotsData>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  const openWoDrawer = () => {
    if (!blockedLot) return;
    setWoDrawerLotId(blockedLot.lotId);
    setBlockedLot(null);
  };

  const closeWoDrawer = () => {
    setWoDrawerLotId(null);
    // Después de cerrar el drawer de WOs, refrescamos por si limpiaron deps.
    refetch();
  };

  return (
    <>
      <ArchivedListPage<LotsData>
        description="Restaurar o eliminar lotes de forma definitiva"
        columns={columns}
        data={lots}
        entity={ENTITY}
        bulk
        getItemLabel={(item) => item.lot_name}
        onRestore={runRestore ?? undefined}
        onHardDelete={runHardDelete ?? undefined}
        onMount={refetch}
        processing={processing || actionProcessing}
        error={blockedLot ? null : error}
      />

      {blockedLot && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4"
          onClick={() => setBlockedLot(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              No se puede eliminar el lote
            </h3>
            <p className="mb-4 text-sm text-slate-700 dark:text-slate-200">
              El lote <strong>{blockedLot.lotName}</strong> tiene{" "}
              <strong>{blockedLot.count}</strong> orden(es) de trabajo asociada(s).
              Tenés que eliminarlas o archivarlas primero.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                onClick={() => setBlockedLot(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
                onClick={openWoDrawer}
              >
                Ver órdenes asociadas →
              </button>
            </div>
          </div>
        </div>
      )}

      <DrawerShell
        open={woDrawerLotId !== null}
        onClose={closeWoDrawer}
        title="Órdenes de trabajo del lote"
      >
        {woDrawerLotId !== null && (
          <ArchivedWorkOrders
            lotIdFilter={woDrawerLotId}
            onAfterRestore={onAfterRestore}
          />
        )}
      </DrawerShell>
    </>
  );
}
