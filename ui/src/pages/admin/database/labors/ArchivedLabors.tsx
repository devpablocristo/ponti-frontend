import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
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

type ArchivedLaborsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedLabors({ onAfterRestore }: ArchivedLaborsProps = {}) {
  const {
    labors,
    getArchivedLabors,
    restoreLabor,
    hardDeleteLabor,
    processing,
    error,
  } = useLabors();

  // El drawer de archivadas no filtra por proyecto seleccionado: muestra siempre
  // todas las labors archivadas del tenant para evitar que se vean vacías cuando
  // el usuario tiene un proyecto activo sin archivos.
  const refetch = useCallback(async () => {
    await getArchivedLabors(null);
  }, [getArchivedLabors]);

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreLabor(id);
      onAfterRestore?.();
    },
    [restoreLabor, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteLabor(id);
      onAfterRestore?.();
    },
    [hardDeleteLabor, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<LaborInfo>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  const safeLabors = Array.isArray(labors) ? labors : [];

  return (
    <ArchivedListPage<LaborInfo>
      description="Restaurar o eliminar labores archivadas."
      columns={columns}
      data={safeLabors}
      entity={ENTITY}
      bulk
      ignoreWorkspaceFilters
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
