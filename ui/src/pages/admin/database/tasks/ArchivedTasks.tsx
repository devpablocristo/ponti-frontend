import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useLabors from "../../../../hooks/useLabors";
import { LaborInfo } from "../../../../hooks/useLabors/types";
import { Column } from "../../types";

const ENTITY_LABEL = "la labor";

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

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
  ]);

  const refetch = useCallback(async () => {
    if (projectId) await getArchivedLabors(projectId);
  }, [getArchivedLabors, projectId]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<LaborInfo>({
      refetch,
      restore: restoreLabor,
      hardDelete: hardDeleteLabor,
    });

  const safeLabors = Array.isArray(labors) ? labors : [];

  return (
    <div>
      <FilterBar filters={filters} />
      <div className="mt-4">
        <ArchivedListPage<LaborInfo>
          description="Restaurar o eliminar labores archivadas del proyecto seleccionado."
          columns={columns}
          data={safeLabors}
          entityLabel={ENTITY_LABEL}
          entityLabelPlural="labores"
          getItemLabel={(item) => item.name}
          onRestore={runRestore ?? undefined}
          onHardDelete={runHardDelete ?? undefined}
          onMount={refetch}
          processing={processing || actionProcessing}
          error={lastError ?? error}
        />
      </div>
    </div>
  );
}
