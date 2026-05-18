import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useLots from "../../../../hooks/useLots";
import type { LotsData } from "../../../../hooks/useLots/types";
import { Column } from "../../types";
import { LOT_ENTITY as ENTITY } from "../../entities";

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
      await hardDeleteLot(id);
      onAfterRestore?.();
    },
    [hardDeleteLot, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<LotsData>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
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
      error={lastError ?? error}
    />
  );
}
