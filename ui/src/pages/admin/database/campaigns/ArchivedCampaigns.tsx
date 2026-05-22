import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useCampaigns from "../../../../hooks/useCampaigns";
import type { Data as Campaign } from "../../../../hooks/useCampaigns/types";
import { Column } from "../../types";
import { CAMPAIGN_ENTITY as ENTITY } from "../../entities";

const columns: Column<Campaign>[] = [
  { key: "name", header: "Campaña" },
];

type ArchivedCampaignsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedCampaigns({ onAfterRestore }: ArchivedCampaignsProps = {}) {
  const {
    archivedCampaigns,
    getArchivedCampaigns,
    restoreCampaign,
    hardDeleteCampaign,
    processing,
    error,
  } = useCampaigns();

  const refetch = useCallback(async () => {
    await getArchivedCampaigns("page=1&per_page=1000");
  }, [getArchivedCampaigns]);

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreCampaign(id);
      onAfterRestore?.();
    },
    [restoreCampaign, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteCampaign(id);
      onAfterRestore?.();
    },
    [hardDeleteCampaign, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<Campaign>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Campaign>
      description="Restaurar o eliminar campañas de forma definitiva"
      columns={columns}
      data={archivedCampaigns}
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
