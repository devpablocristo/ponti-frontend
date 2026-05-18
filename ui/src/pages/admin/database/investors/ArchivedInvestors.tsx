import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useInvestors, { Investor } from "../../../../hooks/useInvestors";
import { Column } from "../../types";
import { INVESTOR_ENTITY as ENTITY } from "../../entities";

const columns: Column<Investor>[] = [
  { key: "name", header: "Inversor" },
];

type ArchivedInvestorsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedInvestors({ onAfterRestore }: ArchivedInvestorsProps = {}) {
  const {
    archivedInvestors,
    getArchivedInvestors,
    restoreInvestor,
    hardDeleteInvestor,
    processing,
    error,
  } = useInvestors();

  const refetch = useCallback(async () => {
    await getArchivedInvestors("page=1&per_page=1000");
  }, [getArchivedInvestors]);

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreInvestor(id);
      onAfterRestore?.();
    },
    [restoreInvestor, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteInvestor(id);
      onAfterRestore?.();
    },
    [hardDeleteInvestor, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Investor>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Investor>
      description="Restaurar o eliminar inversores de forma definitiva"
      columns={columns}
      data={archivedInvestors}
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
