import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useLabors from "../../../../hooks/useLabors";
import { LaborInfo } from "../../../../hooks/useLabors/types";
import { Column } from "../../types";
import { LABOR_ENTITY as ENTITY } from "../../entities";

const columns: Column<LaborInfo>[] = [
  { key: "name", header: "Labor" },
  { key: "category_name", header: "Rubro" },
  {
    key: "contractor_name",
    header: "Contratista",
    render: (value) => String(value ?? ""),
  },
];

export default function ArchivedTasks() {
  const {
    labors,
    getArchivedLabors,
    restoreLabor,
    hardDeleteLabor,
    processing,
    error,
  } = useLabors();

  const { selectedProject } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const selectedProjectId = selectedProject?.id ?? null;

  const refetch = useCallback(async () => {
    if (selectedProjectId) await getArchivedLabors(selectedProjectId);
  }, [getArchivedLabors, selectedProjectId]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<LaborInfo>({
      refetch,
      restore: restoreLabor,
      hardDelete: hardDeleteLabor,
    });

  const safeLabors = Array.isArray(labors) ? labors : [];

  return (
    <ArchivedListPage<LaborInfo>
      description="Restaurar o eliminar labores archivadas del proyecto seleccionado."
      columns={columns}
      data={selectedProjectId ? safeLabors : []}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
