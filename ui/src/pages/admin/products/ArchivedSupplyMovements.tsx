import { useCallback } from "react";

import { ArchivedListPage } from "../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../hooks/useArchiveActions";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useSupplyMovements from "../../../hooks/useSupplyMovement";
import { SupplyMovement } from "../../../hooks/useSupplyMovement/types";
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

export default function ArchivedSupplyMovements() {
  const { selectedProject } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const selectedProjectId = selectedProject?.id ?? null;
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

  const refetch = useCallback(async () => {
    if (selectedProjectId) await getArchivedSupplyMovements(selectedProjectId);
  }, [getArchivedSupplyMovements, selectedProjectId]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<SupplyMovement>({
      refetch,
      restore: selectedProjectId
        ? (id) => restoreSupplyMovement(id, selectedProjectId)
        : undefined,
      hardDelete: selectedProjectId
        ? (id) => hardDeleteSupplyMovement(id, selectedProjectId)
        : undefined,
    });

  return (
    <ArchivedListPage<SupplyMovement>
      description="Restaurar o eliminar movimientos de insumos archivados."
      columns={columns}
      data={selectedProjectId ? supplyMovements : []}
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
