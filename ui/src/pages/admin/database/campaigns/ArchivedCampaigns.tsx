import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useCampaigns from "../../../../hooks/useCampaigns";
import type { Data as Campaign } from "../../../../hooks/useCampaigns/types";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";

const ENTITY: EntityCopy = { article: "la", singular: "campaña", plural: "campañas" };

const columns: Column<Campaign>[] = [
  { key: "name", header: "Campaña" },
];

export default function ArchivedCampaigns() {
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

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Campaign>({
      refetch,
      restore: restoreCampaign,
      hardDelete: hardDeleteCampaign,
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
      error={lastError ?? error}
    />
  );
}
