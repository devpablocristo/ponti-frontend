import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useCrops, { type Crop } from "../../../../hooks/useCrops";
import { Column } from "../../types";
import { CROP_ENTITY as ENTITY } from "../../entities";

const columns: Column<Crop>[] = [
  { key: "name", header: "Cultivo", format: "properName" },
];

type ArchivedCropsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedCrops({ onAfterRestore }: ArchivedCropsProps = {}) {
  const {
    archivedCrops,
    getArchivedCrops,
    restoreCrop,
    hardDeleteCrop,
    processing,
    error,
  } = useCrops();

  const refetch = useCallback(async () => {
    await getArchivedCrops("page=1&per_page=1000");
  }, [getArchivedCrops]);

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreCrop(id);
      onAfterRestore?.();
    },
    [restoreCrop, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteCrop(id);
      onAfterRestore?.();
    },
    [hardDeleteCrop, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<Crop>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Crop>
      description="Restaurar o eliminar cultivos de forma definitiva"
      columns={columns}
      data={archivedCrops}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={error}
    />
  );
}
