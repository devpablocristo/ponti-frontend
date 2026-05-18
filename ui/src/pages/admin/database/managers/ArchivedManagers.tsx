import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useManagers, { Manager } from "../../../../hooks/useManagers";
import { Column } from "../../types";
import { MANAGER_ENTITY as ENTITY } from "../../entities";

const columns: Column<Manager>[] = [
  { key: "name", header: "Responsable" },
];

type ArchivedManagersProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedManagers({ onAfterRestore }: ArchivedManagersProps = {}) {
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

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreManager(id);
      onAfterRestore?.();
    },
    [restoreManager, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteManager(id);
      onAfterRestore?.();
    },
    [hardDeleteManager, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Manager>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Manager>
      description="Restaurar o eliminar responsables de proyecto de forma definitiva"
      columns={columns}
      data={archivedManagers}
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
