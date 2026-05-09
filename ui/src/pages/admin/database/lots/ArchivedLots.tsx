import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useLots from "../../../../hooks/useLots";
import type { LotsData } from "../../../../hooks/useLots/types";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";

const ENTITY: EntityCopy = { article: "el", singular: "lote", plural: "lotes" };

const columns: Column<LotsData>[] = [
  { key: "project_name", header: "Proyecto" },
  { key: "field_name", header: "Campo" },
  { key: "lot_name", header: "Lote" },
  { key: "season", header: "Campaña" },
  { key: "current_crop", header: "Cultivo actual" },
];

export default function ArchivedLots() {
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

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<LotsData>({
      refetch,
      restore: restoreLot,
      hardDelete: hardDeleteLot,
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
