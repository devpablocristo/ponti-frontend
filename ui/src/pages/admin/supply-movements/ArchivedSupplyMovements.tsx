import { useCallback } from "react";

import { ArchivedListPage } from "../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../hooks/useArchiveActions";
import useSupplyMovements from "../../../hooks/useSupplyMovements";
import { SupplyMovement } from "../../../hooks/useSupplyMovements/types";
import { Column } from "../types";

const MOVEMENT_ENTITY = {
  article: "el",
  singular: "movimiento",
  plural: "movimientos",
};

const columns: Column<SupplyMovement>[] = [
  { key: "entry_type", header: "Ingreso" },
  { key: "reference_number", header: "N° Remito" },
  { key: "entry_date", header: "Fecha" },
  { key: "origin_project_name", header: "Proyecto origen" },
  { key: "destination_project_name", header: "Proyecto destino" },
  { key: "investor_name", header: "Inversor" },
  { key: "supply_name", header: "Insumo" },
  { key: "quantity", header: "Cantidad" },
];

type ArchivedSupplyMovementsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedSupplyMovements({ onAfterRestore }: ArchivedSupplyMovementsProps = {}) {
  const {
    supplyMovements,
    getArchivedSupplyMovements,
    restoreSupplyMovement,
    hardDeleteSupplyMovement,
    processing,
    processingDelete,
    error,
    deleteError,
  } = useSupplyMovements();

  // Siempre lista global; no se filtra por proyecto activo del workspace.
  const refetch = useCallback(async () => {
    await getArchivedSupplyMovements(null);
  }, [getArchivedSupplyMovements]);

  const restoreId = useCallback(
    async (id: number) => {
      const item = supplyMovements.find((m) => m.id === id);
      // El BE busca el movement por (project_id, id), así que se necesita el
      // project_id real del movement (no origin/destination).
      const pid =
        item?.project_id ?? item?.origin_project_id ?? item?.destination_project_id ?? null;
      if (!pid) return;
      await restoreSupplyMovement(id, pid);
      onAfterRestore?.();
    },
    [supplyMovements, restoreSupplyMovement, onAfterRestore],
  );

  const hardDeleteId = useCallback(
    async (id: number) => {
      const item = supplyMovements.find((m) => m.id === id);
      const pid =
        item?.project_id ?? item?.origin_project_id ?? item?.destination_project_id ?? null;
      if (!pid) return;
      await hardDeleteSupplyMovement(id, pid);
      onAfterRestore?.();
    },
    [supplyMovements, hardDeleteSupplyMovement, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<SupplyMovement>({
      refetch,
      restore: restoreId,
      hardDelete: hardDeleteId,
    });

  return (
    <ArchivedListPage<SupplyMovement>
      description="Restaurar o eliminar movimientos de insumos archivados."
      columns={columns}
      data={supplyMovements}
      ignoreWorkspaceFilters
      entity={MOVEMENT_ENTITY}
      bulk
      getItemLabel={(item) => item.supply_name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || processingDelete || actionProcessing}
      error={lastError ?? deleteError ?? error}
    />
  );
}
