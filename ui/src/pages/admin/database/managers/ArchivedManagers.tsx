import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useManagers, { Manager } from "../../../../hooks/useManagers";
import { Column } from "../../types";

const ENTITY_LABEL = "el responsable";

const columns: Column<Manager>[] = [
  { key: "name", header: "Responsable" },
];

export default function ArchivedManagers() {
  const {
    archivedManagers,
    getArchivedManagers,
    restoreManager,
    hardDeleteManager,
    processing,
    error,
  } = useManagers();

  const refetch = useCallback(async () => {
    await getArchivedManagers("page=1&per_page=1000");
  }, [getArchivedManagers]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Manager>({
      refetch,
      restore: restoreManager,
      hardDelete: hardDeleteManager,
    });

  return (
    <ArchivedListPage<Manager>
      description="Restaurar o eliminar responsables de proyecto de forma definitiva"
      columns={columns}
      data={archivedManagers}
      entityLabel={ENTITY_LABEL}
      entityLabelPlural="responsables"
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
